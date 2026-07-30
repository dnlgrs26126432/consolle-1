import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GENRE_LABELS } from '@/lib/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Genera un titolo automatico basato su concept, genere e mood.
// Non scrive nulla su DB: il titolo va confermato/modificato dall'utente
// prima di salvarlo sulla traccia.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { concept, genre, mood }: { concept?: string; genre?: string; mood?: string } = body;

    if (!concept && !genre && !mood) {
      return NextResponse.json(
        { error: 'Fornisci almeno un concept, un genere o un mood per generare il titolo' },
        { status: 400 }
      );
    }

    const genreLabel = genre ? GENRE_LABELS[genre as keyof typeof GENRE_LABELS] || genre : null;

    const systemPrompt = `Sei un autore esperto di titoli per brani rap/trap/urban italiani. Restituisci un SOLO titolo, breve (massimo 5 parole), d'impatto, senza virgolette, senza spiegazioni, senza punteggiatura finale.`;

    const userPrompt = `Genera un titolo per una canzone con queste caratteristiche:
${genreLabel ? `Genere: ${genreLabel}` : ''}
${mood ? `Mood: ${mood}` : ''}
${concept ? `Concept/brief: ${concept}` : ''}

Rispondi solo con il titolo, nient'altro.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 30,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const raw = message.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join(' ')
      .trim();

    const title = raw.replace(/^["'“”]+|["'“”]+$/g, '').split('\n')[0].trim();

    return NextResponse.json({ title });
  } catch (err: any) {
    console.error('Errore generazione titolo:', err);
    return NextResponse.json({ error: err.message || 'Errore interno' }, { status: 500 });
  }
}
