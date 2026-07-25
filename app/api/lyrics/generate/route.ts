import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { supabaseServer } from '@/lib/supabase';
import { GENRE_LABELS, type StructureSection } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const GENRE_STYLE_GUIDE: Record<string, string> = {
  'milan-drill':
    'Drill milanese: flow aggressivo e sincopato, ad-lib secchi, immaginario di strada crudo e specifico (quartieri, notte, cemento), slang milanese, bassi 808 mentali, poche metafore floreali, linguaggio diretto e tagliente.',
  'trap-italiana':
    'Trap italiana melodica: hook cantati e orecchiabili, autotune mentale su alcune barre, mix di italiano e inglese, immaginario di lusso/notte/relazioni, flow più fluido e melodico rispetto alla drill.',
  'conscious-hip-hop':
    'Conscious hip-hop: barre dense di significato, storytelling, riferimenti sociali e introspettivi, wordplay elaborato, meno ad-lib e più attenzione al contenuto lirico.',
  'reggaeton-italiano': 'Reggaeton italiano: ritmica dembow, hook ballabili, tema festa/relazioni, italiano con innesti spagnoli.',
  'pop-urban': 'Pop urban italiano: hook immediati e radiofonici, struttura semplice, linguaggio accessibile.',
  custom: 'Segui le indicazioni di mood e riferimenti forniti senza vincoli di genere predefiniti.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      song_id,
      title,
      genre,
      mood,
      reference_artists,
      structure,
      concept_brief,
    }: {
      song_id: string;
      title: string;
      genre: string;
      mood?: string;
      reference_artists?: string;
      structure: StructureSection[];
      concept_brief?: string;
    } = body;

    if (!song_id || !title || !genre || !structure?.length) {
      return NextResponse.json(
        { error: 'song_id, title, genre e structure sono obbligatori' },
        { status: 400 }
      );
    }

    const styleGuide = GENRE_STYLE_GUIDE[genre] || GENRE_STYLE_GUIDE.custom;
    const structureText = structure
      .map((s) => `- ${s.label || s.type} (${s.bars} battute)`)
      .join('\n');

    const systemPrompt = `Sei un autore professionista di testi rap/trap italiani, con esperienza nella scena ${GENRE_LABELS[genre as keyof typeof GENRE_LABELS] || genre}. Scrivi in italiano (con eventuali innesti di slang/inglese quando stilisticamente coerenti). Segui esattamente la struttura di sezioni richiesta, etichettando ogni sezione chiaramente (es. [Intro], [Verse 1], [Hook], ecc). Non scrivere introduzioni o commenti fuori dal testo: restituisci solo il testo strutturato.`;

    const userPrompt = `Titolo canzone: "${title}"
Genere: ${GENRE_LABELS[genre as keyof typeof GENRE_LABELS] || genre}
Stile: ${styleGuide}
${mood ? `Mood: ${mood}` : ''}
${reference_artists ? `Riferimenti artisti: ${reference_artists}` : ''}
${concept_brief ? `Concept/brief: ${concept_brief}` : ''}

Struttura richiesta:
${structureText}

Scrivi il testo completo seguendo questa struttura esatta, sezione per sezione.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const content = message.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    // Salva come nuova versione lyrics
    const db = supabaseServer();

    // Trova il numero di versione successivo
    const { data: existingVersions } = await db
      .from('lyrics_versions')
      .select('version_number')
      .eq('song_id', song_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (existingVersions?.[0]?.version_number || 0) + 1;

    // Rimuovi il flag is_current dalle versioni precedenti
    await db
      .from('lyrics_versions')
      .update({ is_current: false })
      .eq('song_id', song_id);

    const { data: newVersion, error } = await db
      .from('lyrics_versions')
      .insert({
        song_id,
        version_number: nextVersion,
        content,
        concept_notes: concept_brief || null,
        generated_by_ai: true,
        ai_prompt_used: userPrompt,
        is_current: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ lyrics_version: newVersion });
  } catch (err: any) {
    console.error('Errore generazione lyrics:', err);
    return NextResponse.json(
      { error: err.message || 'Errore interno' },
      { status: 500 }
    );
  }
}
