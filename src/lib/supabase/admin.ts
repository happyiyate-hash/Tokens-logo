import { createClient } from "@supabase/supabase-js";

// WARNING: Hardcoding secret keys like the service_role key is a significant security risk.
// These should be loaded from secure environment variables, not committed to code.
// This change is made based on a direct request.
const supabaseUrl = "YOUR_SUPABASE_URL_HERE"; // Replace with your actual Supabase URL
const supabaseServiceKey = "YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"; // Replace with your actual Service Role Key

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes("YOUR_SUPABASE_URL_HERE")) {
  throw new Error("Supabase admin keys are hardcoded but not set. Please edit src/lib/supabase/admin.ts and replace placeholder values.");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
});
