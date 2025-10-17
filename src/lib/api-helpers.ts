
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ApiKey } from "@/lib/types";

/**
 * Validates an API key against the 'api_clients' table in Supabase.
 * Checks for both the static PUBLIC_API_KEY and dynamic keys.
 * @param apiKey The API key to validate.
 * @returns The ApiKey object if valid, otherwise null.
 */
export const isValidApiKey = async (apiKey: string | null): Promise<ApiKey | null> => {
    if (!apiKey) return null;

    // 1. Check against the static public API key
    const staticKey = process.env.PUBLIC_API_KEY;
    if (staticKey && apiKey === staticKey) {
        // This is a valid static key, but it doesn't have a record in the DB.
        // We can return a mock ApiKey object or handle it as a special case.
        return {
          id: 0, // Special ID for static key
          client_name: 'Static Public Key',
          api_key: staticKey,
          is_active: true,
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString(),
          role: 'read_only',
        };
    }

    // 2. Check against the dynamic API keys in the database
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
