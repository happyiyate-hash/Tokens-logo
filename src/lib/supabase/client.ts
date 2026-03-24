import { createClient } from "@supabase/supabase-js";

// Hardcoded Supabase configuration for the client-side.
// The 'anon' key is designed to be public and is visible in the browser.
const supabaseUrl = "YOUR_SUPABASE_URL_HERE"; // Replace with your actual Supabase URL
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY_HERE"; // Replace with your actual Supabase anon key

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("YOUR_SUPABASE_URL_HERE")) {
  throw new Error("Supabase client variables are hardcoded but not set. Please edit src/lib/supabase/client.ts and replace placeholder values.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
