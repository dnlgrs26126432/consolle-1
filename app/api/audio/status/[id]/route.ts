import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Polling: controlla lo stato del job su kie.ai. Se completo, scarica
// l'audio e lo salva su Supabase Storage (così non dipendiamo da URL
// temporanei del provider), poi aggiorna la riga audio_versions.
//
// Il default di Vercel (10s sul piano Hobby) può scadere prima che il
// mirror dell'audio finisca, lasciando la riga bloccata su "processing".
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = supabaseServer();
  const { data: audioVersion, error: fetchErr } = await db
    .from('audio_versions')
    .select('*')
    .eq('id', params.id)
    .single();

  if (fetchErr || !audioVersion) {
    return NextResponse.json({ error: 'Versione audio non trovata' }, { status: 404 });
  }

  if (audioVersion.status === 'completed' || audioVersion.status === 'failed') {
    return NextResponse.json({ audio_version: audioVersion });
  }

  const kieApiKey = process.env.KIE_AI_API_KEY;
  if (!kieApiKey) {
    return NextResponse.json({ error: 'KIE_AI_API_KEY non configurata' }, { status: 500 });
  }

  try {
    const statusRes = await fetch(
      `https://api.kie.ai/api/v1/generate/record-info?taskId=${audioVersion.job_id}`,
      { headers: { Authorization: `Bearer ${kieApiKey}` } }
    );
    const statusData = await statusRes.json();
    console.log(`[audio/status/${params.id}] risposta record-info:`, JSON.stringify(statusData));

    const taskStatus = statusData?.data?.status;
    const tracks = statusData?.data?.data || statusData?.data?.response?.sunoData;

    if (taskStatus === 'SUCCESS' && tracks?.length > 0) {
      const firstTrack = tracks[0];
      const externalUrl = firstTrack.audioUrl || firstTrack.audio_url;
      const duration = firstTrack.duration || null;

      // Mirror del file su Supabase Storage
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
        console.error('Mirror storage fallito, uso URL esterno:', mirrorErr);
      }

      const { data: updated, error: updateErr } = await db
        .from('audio_versions')
        .update({
          status: 'completed',
          audio_url: finalUrl,
          external_audio_url: externalUrl,
          duration_seconds: duration,
          completed_at: new Date().toISOString(),
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`[audio/status/${params.id}] Update fallito:`, updateErr.message);
        return NextResponse.json({ audio_version: audioVersion });
      }

      return NextResponse.json({ audio_version: updated });
    }

    if (taskStatus === 'FAILED' || taskStatus === 'ERROR') {
      const { data: updated, error: updateErr } = await db
        .from('audio_versions')
        .update({
          status: 'failed',
          error_message: statusData?.data?.errorMessage || 'Generazione fallita su kie.ai',
        })
        .eq('id', params.id)
        .select()
        .single();

      if (updateErr) {
        console.error(`[audio/status/${params.id}] Update fallito:`, updateErr.message);
        return NextResponse.json({ audio_version: audioVersion });
      }

      return NextResponse.json({ audio_version: updated });
    }

    // Ancora in corso
    return NextResponse.json({ audio_version: audioVersion });
  } catch (err: any) {
    console.error('Errore polling stato:', err);
    return NextResponse.json({ audio_version: audioVersion });
  }
}
