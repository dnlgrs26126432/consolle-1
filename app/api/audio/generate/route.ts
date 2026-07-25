import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Lancia una generazione audio su kie.ai (Suno-compatible API) e crea
// subito una riga audio_versions in stato "pending" da pollare dal client.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { song_id, lyrics_version_id, prompt, version_label, instrumental } = body;

    if (!song_id || !prompt) {
      return NextResponse.json(
        { error: 'song_id e prompt sono obbligatori' },
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

    // callBackUrl è obbligatorio per kie.ai: viene chiamato a fine
    // generazione (vedi app/api/audio/callback/route.ts). Il polling in
    // /api/audio/status/[id] resta comunque attivo come backup.
    const callBackUrl = new URL('/api/audio/callback', req.url).toString();

    // Chiamata a kie.ai per avviare la generazione (endpoint stile Suno API)
    const kieResponse = await fetch('https://api.kie.ai/api/v1/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${kieApiKey}`,
      },
      body: JSON.stringify({
        prompt,
        customMode: false,
        instrumental: !!instrumental,
        model: 'V4_5',
        callBackUrl,
      }),
    });

    if (!kieResponse.ok) {
      const errText = await kieResponse.text();
      return NextResponse.json(
        { error: `Errore kie.ai: ${errText}` },
        { status: 502 }
      );
    }

    const kieData = await kieResponse.json();

    if (kieData?.code !== 200) {
      return NextResponse.json(
        { error: `Errore kie.ai: ${kieData?.msg || 'richiesta rifiutata'}` },
        { status: 502 }
      );
    }

    const jobId = kieData?.data?.taskId;

    if (!jobId) {
      return NextResponse.json(
        { error: 'kie.ai non ha restituito un taskId valido' },
        { status: 502 }
      );
    }

    const db = supabaseServer();
    const { data, error } = await db
      .from('audio_versions')
      .insert({
        song_id,
        lyrics_version_id: lyrics_version_id || null,
        version_label: version_label || `Take ${new Date().toLocaleTimeString('it-IT')}`,
        provider: 'kie.ai',
        job_id: jobId,
        status: 'processing',
        prompt_used: prompt,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ audio_version: data });
  } catch (err: any) {
    console.error('Errore generazione audio:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
