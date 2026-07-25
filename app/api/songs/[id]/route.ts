import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = supabaseServer();

  const { data: song, error: songErr } = await db
    .from('songs')
    .select('*')
    .eq('id', params.id)
    .single();

  if (songErr) return NextResponse.json({ error: songErr.message }, { status: 404 });

  const { data: lyricsVersions } = await db
    .from('lyrics_versions')
    .select('*')
    .eq('song_id', params.id)
    .order('version_number', { ascending: false });

  const { data: audioVersions } = await db
    .from('audio_versions')
    .select('*')
    .eq('song_id', params.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    song,
    lyrics_versions: lyricsVersions || [],
    audio_versions: audioVersions || [],
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const db = supabaseServer();

  const { data, error } = await db
    .from('songs')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ song: data });
}
