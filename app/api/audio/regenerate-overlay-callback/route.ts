import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Webhook chiamato da kie.ai a fine rigenerazione overlay (callBackUrl
// passato in app/api/audio/regenerate-overlay/route.ts). Stessa forma di
// payload di app/api/audio/callback/route.ts: kie.ai chiama questo
// endpoint una volta per stage (callbackType: "text" -> "first" ->
// "complete"), solo "complete" ha l'audio pronto in data.data[]. Risponde
// sempre 200 per evitare retry del provider.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[audio/regenerate-overlay-callback] payload ricevuto:', JSON.stringify(body));

    const taskId = body?.data?.task_id || body?.data?.taskId || body?.taskId;
    const callbackType = body?.data?.callbackType;

    if (!taskId) {
      console.warn('[audio/regenerate-overlay-callback] payload senza task_id, ignorato');
      return NextResponse.json({ received: true });
    }

    const db = supabaseServer();
    const { data: overlay } = await db
      .from('audio_overlays')
      .select('*')
      .eq('regeneration_task_id', taskId)
      .single();

    if (!overlay) {
      console.warn(`[audio/regenerate-overlay-callback] Nessun overlay trovato per task_id=${taskId}`);
      return NextResponse.json({ received: true });
    }

    if (overlay.regeneration_status === 'completed' || overlay.regeneration_status === 'failed') {
      return NextResponse.json({ received: true });
    }

    if (body?.code !== 200) {
      await db
        .from('audio_overlays')
        .update({
          regeneration_status: 'failed',
          regeneration_error: body?.msg || 'Rigenerazione fallita su kie.ai',
        })
        .eq('id', overlay.id);
      return NextResponse.json({ received: true });
    }

    // Stage intermedi ("text", "first"): audio non ancora pronto, aspettiamo
    // la callback "complete".
    if (callbackType !== 'complete') {
      return NextResponse.json({ received: true });
    }

    const tracks: any[] = body?.data?.data || body?.data?.response?.sunoData || [];
    if (tracks.length === 0) {
      console.warn(
        `[audio/regenerate-overlay-callback] callbackType=complete ma nessuna traccia per task_id=${taskId}`
      );
      return NextResponse.json({ received: true });
    }

    const regeneratedUrl = tracks[0].audioUrl || tracks[0].audio_url || null;

    // A differenza del callback principale (app/api/audio/callback), qui
    // l'URL di kie.ai non viene mirrorato su Supabase Storage: resta l'URL
    // esterno del provider. Se si rivela instabile/temporaneo, allineare a
    // mirrorTrackToStorage() come nel callback principale.
    const { error } = await db
      .from('audio_overlays')
      .update(
        regeneratedUrl
          ? { regeneration_status: 'completed', regenerated_audio_url: regeneratedUrl }
          : { regeneration_status: 'failed', regeneration_error: 'Nessun audio_url nella traccia ricevuta' }
      )
      .eq('id', overlay.id);

    if (error) {
      console.error('[audio/regenerate-overlay-callback] Update fallito:', error.message);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error('Errore callback rigenerazione overlay:', err);
    return NextResponse.json({ received: true });
  }
}
