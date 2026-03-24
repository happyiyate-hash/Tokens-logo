import { createClient } from "@supabase/supabase-js";

// This file uses PUBLIC environment variables to connect to Supabase on the client-side.
// The 'anon' key is designed to be public and is visible in the browser.
const supabaseUrl = "https://gcghriodmljkusdduhzl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ2hyaW9kbWxqa3VzZGR1aHpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzkzMTQsImV4cCI6MjA4NzUxNTMxNH0.TltNWXGtBsRm1VdJ5idiTji863BiKKOD54Q40iXRJy8";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase client values are not set.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
