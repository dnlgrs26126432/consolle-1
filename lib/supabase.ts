import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Client per componenti browser (rispetta RLS)
export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey);

// Client per API routes lato server (bypassa RLS, usare solo server-side)
export function supabaseServer() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}
