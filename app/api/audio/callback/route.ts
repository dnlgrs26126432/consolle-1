import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Webhook chiamato da kie.ai a fine generazione (vedi callBackUrl passato in
// app/api/audio/generate/route.ts). Fa da backup al polling di
// /api/audio/status/[id]: se il client non sta pollando, il completamento
// arriva comunque qui. Risponde sempre 200 per evitare retry del provider.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const taskId = body?.data?.taskId || body?.data?.task_id || body?.taskId;

    if (!taskId) {
      return NextResponse.json({ received: true });
    }

    const db = supabaseServer();
    const { data: audioVersion } = await db
      .from('audio_versions')
      .select('*')
      .eq('job_id', taskId)
      .single();

    if (!audioVersion || audioVersion.status === 'completed' || audioVersion.status === 'failed') {
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

    const tracks = body?.data?.response?.sunoData || body?.data?.data;
    const firstTrack = tracks?.[0];

    // callbackType intermedi (es. "text") non hanno ancora l'audio: ignora,
    // arriverà un'altra callback con callbackType "complete".
    if (!firstTrack) {
      return NextResponse.json({ received: true });
    }

    const externalUrl = firstTrack.audioUrl || firstTrack.audio_url;
    const duration = firstTrack.duration || null;

    // Mirror del file su Supabase Storage (come in /api/audio/status/[id])
    let finalUrl = externalUrl;
    try {
      const audioRes = await fetch(externalUrl);
      const audioBuffer = await audioRes.arrayBuffer();
      const fileName = `${audioVersion.song_id}/${audioVersion.id}.mp3`;

      const { error: uploadErr } = await db.storage
        .from('audio-generations')
        .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });

      if (!uploadErr) {
        const { data: publicUrlData } = db.storage
          .from('audio-generations')
          .getPublicUrl(fileName);
        finalUrl = publicUrlData.publicUrl;
      }
    } catch (mirrorErr) {
      console.error('Mirror storage fallito nel callback, uso URL esterno:', mirrorErr);
    }

    await db
      .from('audio_versions')
      .update({
        status: 'completed',
        audio_url: finalUrl,
        external_audio_url: externalUrl,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq('id', audioVersion.id);

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Errore callback kie.ai:', err);
    return NextResponse.json({ received: true });
  }
}
