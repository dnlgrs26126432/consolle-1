import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET() {
  const db = supabaseServer();
  const { data, error } = await db
    .from('projects')
    .select('*, songs(*)')
    .order('updated_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description } = body;

  if (!name) {
    return NextResponse.json({ error: 'name è obbligatorio' }, { status: 400 });
  }

  const db = supabaseServer();
  const { data, error } = await db
    .from('projects')
    .insert({ name, description: description || null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
