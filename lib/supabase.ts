import { createClient } from '@supabase/supabase-js';

// Client server-side con service role key: bypassa la RLS, va usato
// solo dentro le API routes (mai esposto al browser).
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Supabase non configurato: imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nelle env vars.'
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
