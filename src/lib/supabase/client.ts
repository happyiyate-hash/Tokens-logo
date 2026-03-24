import { createClient } from "@supabase/supabase-js";

// This file uses PUBLIC environment variables to connect to Supabase on the client-side.
// The 'anon' key is designed to be public and is visible in the browser.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase client environment variables are not set. Prefix public variables with NEXT_PUBLIC_.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
