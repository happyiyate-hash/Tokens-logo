
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ApiKey } from "@/lib/types";

/**
 * Validates an API key against the 'api_clients' table in Supabase.
 * @param apiKey The API key to validate.
 * @returns The ApiKey object if valid, otherwise null.
 */
export const isValidApiKey = async (apiKey: string | null): Promise<ApiKey | null> => {
    if (!apiKey) return null;

    try {
        const { data, error } = await supabaseAdmin
          .from('api_clients')
          .select('*')
          .eq('api_key', apiKey)
          .eq('is_active', true)
          .single();
        
        if (error || !data) {
          return null;
        }
        
        return data;
    } catch (e) {
        console.error("API Key validation error:", e);
        return null;
    }
};
