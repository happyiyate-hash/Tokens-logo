import { createClient } from "@supabase/supabase-js";

// This file uses environment variables to connect to Supabase.
// The service_role key is a secret and is ONLY available on the server.
const supabaseUrl = "https://cpmgeoihmppdlkwybnzk.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInRwCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwbWdlb2lobXBwZGxrd3libnprIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcyNzIwNiwiZXhwIjoyMDc2MzAzMjA2fQ._GSUb1OV2lwrZb1g2twe6-kxV6crQwP5Zq9B_7FsUDo";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase admin values are not set.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
});
