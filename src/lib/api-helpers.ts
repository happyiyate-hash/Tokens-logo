
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validates an API key against the 'api_keys' table in Supabase.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating if the key is valid.
 */
export const isValidApiKey = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;

    // Basic format check
    if (!apiKey.startsWith('dcdn_')) return false;

    try {
        const { data, error } = await supabaseAdmin
          .from('api_keys')
          .select('id')
          .eq('key', apiKey)
          .single();
        
        return !error && !!data;
    } catch (e) {
        console.error("API Key validation error:", e);
        return false;
    }
}
