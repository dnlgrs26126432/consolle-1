import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

type SupabaseClient = ReturnType<typeof supabaseServer>;

// Webhook chiamato da kie.ai a fine generazione (vedi callBackUrl passato in
// app/api/audio/generate/route.ts). Fa da backup al polling di
// /api/audio/status/[id]: se il client non sta pollando, il completamento
// arriva comunque qui. Risponde sempre 200 per evitare retry del provider.
//
// kie.ai chiama questo endpoint una volta per stage (callbackType: "text" ->
// "first" -> "complete"). Solo "complete" ha l'audio pronto, annidato in
// data.data[] (snake_case: task_id, audio_url, ...) — struttura confermata
// dai payload reali ricevuti in produzione, non dalla doc generica.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[audio/callback] payload ricevuto:', JSON.stringify(body));

    const taskId = body?.data?.task_id || body?.data?.taskId || body?.taskId;
    const callbackType = body?.data?.callbackType;

    if (!taskId) {
      console.warn('[audio/callback] payload senza task_id, ignorato');
      return NextResponse.json({ received: true });
    }

    const db = supabaseServer();
    const { data: audioVersion } = await db
      .from('audio_versions')
      .select('*')
      .eq('job_id', taskId)
      .single();

    if (!audioVersion) {
      console.warn(`[audio/callback] Nessuna audio_version trovata per job_id=${taskId}`);
      return NextResponse.json({ received: true });
    }

    if (audioVersion.status === 'completed' || audioVersion.status === 'failed') {
      return NextResponse.json({ received: true });
    }

    if (body?.code !== 200) {
      await db
        .from('audio_versions')
        .update({
          status: 'failed',
          error_message: body?.msg || 'Generazione fallita su kie.ai',
        })
        .eq('id', audioVersion.id);
      return NextResponse.json({ received: true });
    }

    // Stage intermedi ("text", "first"): audio non ancora pronto, aspettiamo
    // la callback "complete".
    if (callbackType !== 'complete') {
      return NextResponse.json({ received: true });
    }

    const tracks: any[] = body?.data?.data || body?.data?.response?.sunoData || [];
    if (tracks.length === 0) {
      console.warn(`[audio/callback] callbackType=complete ma nessuna traccia in data.data per task_id=${taskId}`);
      return NextResponse.json({ received: true });
    }

    const [firstTrack, ...extraTracks] = tracks;

    const primaryUrl = await mirrorTrackToStorage(
      db,
      firstTrack,
      `${audioVersion.song_id}/${audioVersion.id}.mp3`
    );

    await db
      .from('audio_versions')
      .update({
        status: 'completed',
        audio_url: primaryUrl,
        external_audio_url: firstTrack.audioUrl || firstTrack.audio_url || null,
        duration_seconds: firstTrack.duration || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audioVersion.id);

    // kie.ai genera in genere più varianti per lo stesso task: quelle oltre
    // la prima diventano nuove take dello stesso brano, per non perderle.
    for (let i = 0; i < extraTracks.length; i++) {
      const track = extraTracks[i];
      const { data: extraVersion } = await db
        .from('audio_versions')
        .insert({
          song_id: audioVersion.song_id,
          lyrics_version_id: audioVersion.lyrics_version_id,
          version_label: `${audioVersion.version_label || 'Take'} (variante ${i + 2})`,
          provider: audioVersion.provider,
          job_id: audioVersion.job_id,
          status: 'processing',
          prompt_used: audioVersion.prompt_used,
        })
        .select()
        .single();

      if (!extraVersion) continue;

      const extraUrl = await mirrorTrackToStorage(
        db,
        track,
        `${audioVersion.song_id}/${extraVersion.id}.mp3`
      );

      await db
        .from('audio_versions')
        .update({
          status: 'completed',
          audio_url: extraUrl,
          external_audio_url: track.audioUrl || track.audio_url || null,
          duration_seconds: track.duration || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', extraVersion.id);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Errore callback kie.ai:', err);
    return NextResponse.json({ received: true });
  }
}

// Scarica una traccia da kie.ai e la mirra su Supabase Storage; se l'URL è
// vuoto o il mirror fallisce, ricade sull'URL esterno del provider.
async function mirrorTrackToStorage(db: SupabaseClient, track: any, fileName: string) {
  const externalUrl = track?.audioUrl || track?.audio_url;
  if (!externalUrl) return null;

  try {
    const audioRes = await fetch(externalUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    const { error: uploadErr } = await db.storage
      .from('audio-generations')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

    if (uploadErr) return externalUrl;

    const { data: publicUrlData } = db.storage.from('audio-generations').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (mirrorErr) {
    console.error('Mirror storage fallito nel callback, uso URL esterno:', mirrorErr);
    return externalUrl;
  }
}
