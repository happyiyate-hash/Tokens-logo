
import { createClient } from "@supabase/supabase-js";

// This helper is for validating keys against the DB, for dynamic keys.
// For the simple, single static key, we can just compare it directly.

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Validates a dynamic API key against the 'api_keys' table in Supabase.
 * @param apiKey The API key to validate.
 * @returns A boolean indicating if the key is valid.
 */
export const isDynamicApiKeyValid = async (apiKey: string): Promise<boolean> => {
    if (!apiKey) return false;
    
    // This function is for when you store multiple API keys in the database.
    // For a single static key, direct comparison is simpler.
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


/**
 * Validates a static API key from environment variables.
 * @param apiKey The client-provided API key.
 * @returns A boolean indicating if the key is valid.
 */
export const isValidApiKey = async (apiKey: string | null): Promise<boolean> => {
    if (!apiKey) return false;
    
    const validKey = process.env.PUBLIC_API_KEY;
    if (!validKey) {
        console.error("PUBLIC_API_KEY is not set in environment variables.");
        return false; // Or handle as a server configuration error
    }

    return apiKey === validKey;
};
