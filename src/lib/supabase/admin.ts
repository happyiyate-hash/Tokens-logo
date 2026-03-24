import { createClient } from "@supabase/supabase-js";

// This file uses environment variables to connect to Supabase.
// The service_role key is a secret and is ONLY available on the server.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase admin environment variables are not set. Please check your .env file.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
});
