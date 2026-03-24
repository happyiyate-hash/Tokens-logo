import { createClient } from "@supabase/supabase-js";

// This file uses environment variables to connect to Supabase.
// The service_role key is a secret and is ONLY available on the server.
const supabaseUrl = "https://gcghriodmljkusdduhzl.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ2hyaW9kbWxqa3VzZGR1aHpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzOTMxNCwiZXhwIjoyMDg3NTE1MzE0fQ.QCWXCs-K4C96zvQcvaBLNqVqxAA7GKUXEulEruVbaE4";

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Supabase admin values are not set.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
});
