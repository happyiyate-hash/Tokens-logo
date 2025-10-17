
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validates an API key against the 'api_keys' table in Supabase.
 * Checks for both the static PUBLIC_API_KEY and dynamic keys.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating if the key is valid.
 */
export const isValidApiKey = async (apiKey: string | null): Promise<boolean> => {
    if (!apiKey) return false;

    // 1. Check against the static public API key
    const staticKey = process.env.PUBLIC_API_KEY;
    if (staticKey && apiKey === staticKey) {
        return true;
    }

    // 2. Check against the dynamic API keys in the database
    try {
        const { data, error } = await supabaseAdmin
          .from('api_keys')
          .select('id')
          .eq('key', apiKey)
          .single();
        
        // If there's no error and data is found, the key is valid.
        return !error && !!data;
    } catch (e) {
        console.error("API Key validation error:", e);
        return false;
    }
};
