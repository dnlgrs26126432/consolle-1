import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Rigenera un overlay (voce/effetto registrato sopra una traccia già
// generata) chiamando kie.ai in uno dei modi supportati. Stesso pattern di
// app/api/audio/generate/route.ts: chiamata diretta a api.kie.ai con
// KIE_AI_API_KEY, nessun proxy intermedio.

const ENDPOINT_BY_MODE: Record<string, string> = {
  extend: '/api/v1/generate/upload-extend',
  cover: '/api/v1/generate/upload-cover',
  add_vocals: '/api/v1/generate/add-vocals', // verifica il path esatto contro la doc kie.ai per il piano attivo
};

export async function POST(req: NextRequest) {
  const db = supabaseServer();
  let overlayId: string | undefined;

  try {
    const body = await req.json();
    overlayId = body?.overlayId;
    const mode = body?.mode;

    if (!overlayId || !mode || !ENDPOINT_BY_MODE[mode]) {
      return NextResponse.json(
        { error: 'overlayId e mode (extend|cover|add_vocals) sono obbligatori' },
        { status: 400 }
      );
    }

    const kieApiKey = process.env.KIE_AI_API_KEY;
    if (!kieApiKey) {
      return NextResponse.json(
        { error: 'KIE_AI_API_KEY non configurata su Vercel. Aggiungila nelle Environment Variables.' },
        { status: 500 }
      );
    }

    const { data: overlay, error: overlayErr } = await db
      .from('audio_overlays')
      .select('*, audio_versions(audio_url, generation_params)')
      .eq('id', overlayId)
      .single();

    if (overlayErr || !overlay) {
      return NextResponse.json({ error: 'Overlay non trovato' }, { status: 404 });
    }

    // Resta coerente con lo stile della traccia base: riusa i parametri
    // salvati quando quella traccia è stata generata.
    const baseParams = overlay.audio_versions?.generation_params || {};
    const callBackUrl = new URL('/api/audio/regenerate-overlay-callback', req.url).toString();

    const payload = {
      uploadUrl: overlay.raw_audio_url,
      model: baseParams.model || 'V4',
      style: baseParams.style,
      title: baseParams.title,
      callBackUrl,
      ...(mode === 'extend' ? { continueAt: 0, instrumental: false } : {}),
      ...(mode === 'cover' ? { customMode: true, instrumental: false } : {}),
    };

    const kieRes = await fetch(`https://api.kie.ai${ENDPOINT_BY_MODE[mode]}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kieApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!kieRes.ok) {
      const errBody = await kieRes.text();
      await db
        .from('audio_overlays')
        .update({ regeneration_status: 'failed', regeneration_error: errBody })
        .eq('id', overlayId);
      return NextResponse.json(
        { error: 'kie.ai ha rifiutato la richiesta', details: errBody },
        { status: 502 }
      );
    }

    const kieData = await kieRes.json();
    const taskId = kieData?.data?.taskId || kieData?.taskId;

    if (!taskId) {
      await db
        .from('audio_overlays')
        .update({
          regeneration_status: 'failed',
          regeneration_error: 'kie.ai non ha restituito un taskId valido',
        })
        .eq('id', overlayId);
      return NextResponse.json({ error: 'kie.ai non ha restituito un taskId valido' }, { status: 502 });
    }

    // Il callback (o il polling lato client) aggiornerà regeneration_status
    // a "completed" quando la traccia rigenerata è pronta.
    await db
      .from('audio_overlays')
      .update({
        regeneration_mode: mode,
        regeneration_status: 'pending',
        regeneration_task_id: taskId,
        regeneration_params: payload,
      })
      .eq('id', overlayId);

    return NextResponse.json({ taskId });
  } catch (err: any) {
    console.error('Errore rigenerazione overlay:', err);
    if (overlayId) {
      await db
        .from('audio_overlays')
        .update({ regeneration_status: 'failed', regeneration_error: err.message })
        .eq('id', overlayId);
    }
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
