import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { project_id, title, genre, mood, bpm, key_signature, reference_artists, structure } = body;

  if (!project_id || !title) {
    return NextResponse.json({ error: 'project_id e title sono obbligatori' }, { status: 400 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from('songs')
    .insert({
      project_id,
      title,
      genre: genre || 'trap-italiana',
      mood: mood || null,
      bpm: bpm || null,
      key_signature: key_signature || null,
      reference_artists: reference_artists || null,
      structure: structure || [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data });
}
