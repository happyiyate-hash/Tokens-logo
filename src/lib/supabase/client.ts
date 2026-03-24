import { createClient } from "@supabase/supabase-js";

// This file uses PUBLIC environment variables to connect to Supabase on the client-side.
// The 'anon' key is designed to be public and is visible in the browser.
const supabaseUrl = "https://cpmgeoihmppdlkwybnzk.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbWdlb2lobXBwZGxrd3libnprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MjcyMDYsImV4cCI6MjA3NjMwMzIwNn0.lnt2GkvMR6gkR69deuGgcbnVIFx7VzNxkGz8kSUGvEU";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase client values are not set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
