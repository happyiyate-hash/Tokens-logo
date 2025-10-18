
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ApiKey, TokenFetchResult, TokenDetails, TokenMetadata, TokenLogo, Network } from "@/lib/types";
import chainsConfig from "@/lib/chains.json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchTokenMetadataFromSources } from "@/lib/fetchers";
import axios from 'axios';
import { autoFetchMissingLogo } from '@/ai/flows/auto-fetch-missing-logos';

const STORAGE_BUCKET = "token_logos";
const CACHE_TTL = Number(process.env.CACHE_TTL_MS || 7 * 24 * 3600 * 1000);


// --- Internal Centralized Logo URL Generator ---
/**
 * This function does NOT fetch the logo. It constructs the URL that points
 * to our new CDN endpoint. This is the single source of truth for generating logo URLs.
 * @param name The token name (e.g., "Arbitrum").
 * @param symbol The token symbol (e.g., "ETH").
 * @returns The CDN URL for the logo.
 */
function getCdnLogoUrl(name: string, symbol: string): string {
    const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
    return `/api/cdn/logo/${sanitizedName}/${symbol.toLowerCase()}`;
}


// --- Uploader for Global Logos ---

export type AddGlobalLogoState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addGlobalLogoSchema = z.object({
  symbol: z.string().min(1, "Token symbol is required."),
  name: z.string().min(1, "Token name is required."),
  logoFile: z.instanceof(File).refine(file => file.size > 0, 'Logo file is required.'),
});

export async function addGlobalLogo(
  prevState: AddGlobalLogoState | undefined,
  formData: FormData
): Promise<AddGlobalLogoState> {
  const logoFileValue = formData.get('logo');
  const validated = addGlobalLogoSchema.safeParse({
      symbol: formData.get('symbol'),
      name: formData.get('name'),
      logoFile: logoFileValue instanceof File ? logoFileValue : undefined,
  });

  if (!validated.success) {
      const fieldErrors = validated.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return { status: "error", message: firstError || "Invalid input." };
  }

  const { logoFile, symbol, name } = validated.data;
  const upperCaseSymbol = symbol.toUpperCase();
  const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
  
  // The storage path now includes the name to ensure uniqueness for shared symbols.
  const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
  const filePath = `global/${sanitizedName}-${upperCaseSymbol.toLowerCase()}.${ext}`;

  try {
      // Check if a logo with the same NAME already exists.
      const { data: existingLogo, error: fetchError } = await supabaseAdmin
        .from('token_logos')
        .select('id')
        .ilike('name', name) // Case-insensitive check on the name
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`);
      }

      const fileContents = await logoFile.arrayBuffer();
      
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileContents, { contentType: logoFile.type, upsert: true });

      if (uploadError) {
        throw new Error(`Storage upload error: ${uploadError.message}`);
      }
      
      const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      
      const upsertData = {
          symbol: upperCaseSymbol,
          name: name,
          public_url: publicUrlData.publicUrl,
          storage_path: filePath,
      };

      if (existingLogo) {
          // UPDATE existing logo found by name
          const { error: updateError } = await supabaseAdmin
              .from('token_logos')
              .update(upsertData)
              .eq('id', existingLogo.id);
          if (updateError) throw new Error(`Database update error: ${updateError.message}`);
      } else {
          // INSERT new logo
          const { error: insertError } = await supabaseAdmin
              .from('token_logos')
              .insert(upsertData);
          if (insertError) throw new Error(`Database insert error: ${insertError.message}`);
      }

      revalidatePath("/tokens");
      revalidatePath("/upload-token");
      revalidatePath("/logos");
      return { status: "success", message: `Logo for ${name} (${upperCaseSymbol}) saved successfully!` };

  } catch (e: any) {
      console.error("[addGlobalLogo Error]", e);
      return { status: "error", message: e.message };
  }
}

// --- Updater for Global Logos ---

export type UpdateGlobalLogoState = {
    status: "idle" | "success" | "error";
    message?: string;
};

const updateGlobalLogoSchema = z.object({
  logoId: z.string().min(1, "Logo ID is required."),
  symbol: z.string().min(1, "Symbol is required."),
  name: z.string().min(1, "Name is required."),
  logoFile: z.instanceof(File).optional(),
});


export async function updateGlobalLogo(
    prevState: UpdateGlobalLogoState | undefined,
    formData: FormData
): Promise<UpdateGlobalLogoState> {
    const logoFileValue = formData.get('logo');
    const validated = updateGlobalLogoSchema.safeParse({
        logoId: formData.get('logoId'),
        symbol: formData.get('symbol'),
        name: formData.get('name'),
        logoFile: logoFileValue instanceof File && logoFileValue.size > 0 ? logoFileValue : undefined,
    });

    if (!validated.success) {
        const fieldErrors = validated.error.flatten().fieldErrors;
        const firstError = Object.values(fieldErrors)[0]?.[0];
        return { status: "error", message: firstError || "Invalid input." };
    }

    const { logoId, symbol, name, logoFile } = validated.data;

    try {
        const { data: existingLogo, error: fetchError } = await supabaseAdmin
            .from("token_logos")
            .select("storage_path, public_url")
            .eq("id", logoId)
            .single();

        if (fetchError || !existingLogo) {
            throw new Error("Original logo record not found.");
        }

        let newPublicUrl: string = existingLogo.public_url;
        let newStoragePath: string = existingLogo.storage_path;

        // If a new file is uploaded, handle storage operations
        if (logoFile) {
            const fileContents = await logoFile.arrayBuffer();
            const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
            const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
            const filePath = `global/${sanitizedName}-${symbol.toLowerCase()}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, fileContents, { contentType: logoFile.type, upsert: true });

            if (uploadError) {
                throw new Error(`Storage upload error: ${uploadError.message}`);
            }

            const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
            newPublicUrl = publicUrlData.publicUrl;
            newStoragePath = filePath;
        }

        const updateData: Partial<TokenLogo> = {
            name: name,
            public_url: newPublicUrl,
            storage_path: newStoragePath
        };
        
        const { error: updateError } = await supabaseAdmin
            .from("token_logos")
            .update(updateData)
            .eq("id", logoId);

        if (updateError) {
            throw new Error(`Database update error: ${updateError.message}`);
        }

        revalidatePath("/logos");
        return { status: "success", message: "Logo updated successfully!" };

    } catch (e: any) {
        console.error("[updateGlobalLogo Error]", e);
        return { status: "error", message: e.message };
    }
}


// --- Add/Update Token ---

export type AddTokenState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addTokenSchema = z.object({
  name: z.string().min(1, "Token name is required."),
  symbol: z.string().min(1, "Token symbol is required."),
  chainId: z.string().min(1, "Chain ID is required."),
  decimals: z.coerce.number().int().min(0).default(18),
  contract: z.string().min(1, "Contract address is required."),
});


export async function addToken(
  prevState: AddTokenState | undefined,
  formData: FormData
): Promise<AddTokenState> {
  const validated = addTokenSchema.safeParse({
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      chainId: formData.get('chainId'),
      decimals: formData.get('decimals'),
      contract: formData.get('contract'), 
  });

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { symbol, name, decimals, chainId, contract } = validated.data;
  
  try {
    const finalLogoUrl = getCdnLogoUrl(name, symbol);
    
    const chainConfig = chainsConfig.find(c => c.chainId.toString() === chainId);
    if (!chainConfig) throw new Error("Network not found for contract-specific metadata.");

    const tokenDetails: TokenDetails = { name, symbol, decimals };
    
    const { error: upsertError } = await supabaseAdmin
        .from("token_metadata")
        .upsert({ 
            contract_address: contract.toLowerCase(),
            network: chainConfig.name.toLowerCase(),
            token_details: tokenDetails,
            logo_url: finalLogoUrl, // The linked CDN URL
            source: "manual",
            verified: true,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        }, { onConflict: 'contract_address, network' });

    if (upsertError) {
      throw new Error(`Database metadata upsert error: ${upsertError.message}`);
    }

    revalidatePath("/tokens");
    revalidatePath("/add-token");
    revalidatePath("/logos");
    return { status: "success", message: `${symbol.toUpperCase()} token and metadata saved successfully!` };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}


// --- API Key Management ---

export async function getApiKeys(): Promise<ApiKey[]> {
  const { data, error } = await supabaseAdmin
    .from('api_clients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching API keys:", error);
    return [];
  }
  return data;
}

export type GenerateApiKeyState = {
  status: "idle" | "success" | "error" | "executing";
  message?: string;
  newKey?: string;
};

const generateApiKeySchema = z.object({
  name: z.string().min(1, "Key name is required."),
});

export async function generateNewApiKey(
  prevState: GenerateApiKeyState | undefined,
  formData: FormData
): Promise<GenerateApiKeyState> {
  const validated = generateApiKeySchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Key name is required." };
  }
  
  try {
    // Generate the key directly in the server action. This is more robust.
    const { data: uuidData } = await supabaseAdmin.rpc('uuid_generate_v4');
    if (!uuidData) throw new Error("Failed to generate UUID from database.");
    const newKey = `wevina_${uuidData.replace(/-/g, '')}`;

    const { data, error } = await supabaseAdmin
        .from('api_clients')
        .insert({
            client_name: validated.data.name,
            api_key: newKey
        })
        .select()
        .single();
  
    if (error) {
      // This will catch unique constraint violations if the key somehow already exists.
      throw new Error(`Failed to insert new key: ${error.message}`);
    }
    
    revalidatePath('/api-keys');
    return { status: "success", message: "API Key generated successfully.", newKey: data.api_key };
  } catch (e: any) {
     return { status: "error", message: e.message };
  }
}

export async function deleteApiKey(
  keyId: number,
): Promise<{ status: "success" | "error", message: string }> {
  const { error } = await supabaseAdmin
    .from('api_clients')
    .delete()
    .eq('id', keyId);

  if (error) {
    return { status: "error", message: `Failed to delete key: ${error.message}` };
  }
  
  revalidatePath('/api-keys');
  return { status: "success", message: "API Key deleted." };
}

export async function deleteToken(tokenId: string): Promise<{ status: "success" | "error", message: string }> {
  const { error } = await supabaseAdmin
    .from("token_metadata")
    .delete()
    .eq("id", tokenId);

  if (error) {
    return {
      status: "error",
      message: `Failed to delete token: ${error.message}`,
    };
  }

  revalidatePath("/tokens");
  return { status: "success", message: "Token deleted." };
}

// --- Token Search ---

export type SearchState = {
  status: "idle" | "success" | "error";
  message?: string;
  token?: TokenMetadata;
};

const searchTokenSchema = z.object({
  tokenSymbol: z.string().min(1, "Token symbol is required."),
});

export async function searchToken(
  prevState: SearchState | undefined,
  formData: FormData
): Promise<SearchState> {
  const validated = searchTokenSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { status: "error", message: "Token symbol is required." };
  }
  
  const { tokenSymbol } = validated.data;
  const upperCaseSymbol = tokenSymbol.toUpperCase();

  try {
    // This search is on the metadata table which has the pre-linked logo_url
    const { data, error } = await supabaseAdmin
      .from("token_metadata")
      .select("*")
      .ilike("token_details->>symbol", upperCaseSymbol)
      .limit(1)
      .maybeSingle();

    if (data && !error) {
        return { status: "success", token: data };
    }
    
    return { status: "error", message: `Token with symbol "${tokenSymbol}" not found.` };

  } catch (e: any) {
    return { status: "error", message: e.message };
  }
}

// --- Network Management ---

export type AddNetworkState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const addNetworkSchema = z.object({
  name: z.string().min(1, "Network name is required."),
  chain_id: z.coerce.number().int("Chain ID must be an integer."),
  explorer_api_base_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

export async function addNetwork(prevState: AddNetworkState | undefined, formData: FormData): Promise<AddNetworkState> {
  const validated = addNetworkSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }

  try {
    const { error } = await supabaseAdmin.from("networks").insert({
        name: validated.data.name,
        chain_id: validated.data.chain_id,
        explorer_api_base_url: validated.data.explorer_api_base_url || null,
        explorer_api_key_env_var: 'ETHERSCAN_API_KEY' // Always use the main key
    });
    if (error) {
      if (error.code === '23505') {
         throw new Error(`Network with this name or Chain ID already exists.`);
      }
      throw error;
    }

    revalidatePath("/networks");
    return { status: "success", message: "Network added successfully!" };
  } catch(e: any) {
    return { status: "error", message: e.message };
  }
}

export type UpdateNetworkLogoState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const updateNetworkLogoSchema = z.object({
  networkId: z.string().min(1, "Network ID is required."),
  logoFile: z.instanceof(File).refine(file => file.size > 0, 'Logo file is required.'),
});

export async function updateNetworkLogo(
  prevState: UpdateNetworkLogoState | undefined,
  formData: FormData
): Promise<UpdateNetworkLogoState> {
  const logoFileValue = formData.get('logo');
  const validated = updateNetworkLogoSchema.safeParse({
      networkId: formData.get('networkId'),
      logoFile: logoFileValue instanceof File ? logoFileValue : undefined,
  });
  
  if (!validated.success) {
      return { status: "error", message: "Invalid input. Network ID and a logo file are required." };
  }

  const { networkId, logoFile } = validated.data;

  try {
      const { data: network, error: fetchError } = await supabaseAdmin
        .from("networks")
        .select("name, chain_id")
        .eq("id", networkId)
        .single();
      
      if (fetchError || !network) throw new Error("Network not found.");

      const fileContents = await logoFile.arrayBuffer();
      const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `networks/${network.name.toLowerCase().replace(/\s/g, '-')}-${Date.now()}.${ext}`;

      // 1. Upload logo for the network
      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, fileContents, { contentType: logoFile.type, upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

      // 2. Update the logo_url in the networks table
      const { error: dbUpdateError } = await supabaseAdmin
        .from("networks")
        .update({ logo_url: publicUrlData.publicUrl })
        .eq("id", networkId);

      if (dbUpdateError) throw new Error(`Database update for network logo failed: ${dbUpdateError.message}`);

      // 3. (NEW) Upsert the native currency logo into the global token_logos table
      const chainConfig = chainsConfig.find(c => c.chainId === network.chain_id);
      if (chainConfig && chainConfig.nativeCurrencySymbol) {
          const globalLogoPath = `global/${network.name.toLowerCase().replace(/\s/g, '-')}-${chainConfig.nativeCurrencySymbol.toLowerCase()}.${ext}`;

          // Copy the recently uploaded network logo to a new path for the global logo
          const { error: copyError } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .copy(filePath, globalLogoPath, { upsert: true });

          if (copyError) {
              console.warn(`Could not copy network logo to global logo path: ${copyError.message}`);
          } else {
            const { data: globalPublicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(globalLogoPath);
            
            // Check if a logo for this NAME already exists
            const { data: existingLogo, error: existingLogoError } = await supabaseAdmin
                .from("token_logos")
                .select("id")
                .ilike("name", network.name)
                .limit(1)
                .maybeSingle();

            if(existingLogoError) {
              console.error(`Error checking for existing global logo for ${network.name}: ${existingLogoError.message}`);
            } else {
              const upsertData = {
                  symbol: chainConfig.nativeCurrencySymbol,
                  name: network.name, // Use network name for the token name
                  public_url: globalPublicUrlData.publicUrl,
                  storage_path: globalLogoPath,
              };

              if (existingLogo) {
                  // Update existing
                  const { error: globalUpdateError } = await supabaseAdmin
                      .from("token_logos")
                      .update(upsertData)
                      .eq("id", existingLogo.id);
                  if (globalUpdateError) console.error(`Failed to update global logo for ${network.name}: ${globalUpdateError.message}`);

              } else {
                  // Insert new
                  const { error: globalInsertError } = await supabaseAdmin
                      .from("token_logos")
                      .insert(upsertData);
                  if (globalInsertError) console.error(`Failed to insert global logo for ${network.name}: ${globalInsertError.message}`);
              }
            }
          }
      }


      revalidatePath("/networks");
      revalidatePath("/logos"); // Also revalidate the logos page
      return { status: "success", message: "Network logo updated and native token logo saved!" };

  } catch(e: any) {
    console.error('[updateNetworkLogo Error]', e);
    return { status: "error", message: e.message };
  }
}

export async function deleteNetwork(networkId: string): Promise<{ status: "success" | "error", message: string }> {
  const { data: network } = await supabaseAdmin.from("networks").select('name').eq("id", networkId).single();
  if (!network) {
    return { status: "error", message: "Network not found."};
  }

  const { data: tokens, error: tokenError } = await supabaseAdmin
    .from("token_metadata")
    .select("id")
    .eq("network", network.name.toLowerCase()) 
    .limit(1);

  if (tokenError) {
    return { status: "error", message: `Failed to check for tokens on network: ${tokenError.message}`};
  }

  if (tokens && tokens.length > 0) {
    return { status: "error", message: "Cannot delete network because it still has tokens associated with it." };
  }

  const { error } = await supabaseAdmin
    .from("networks")
    .delete()
    .eq("id", networkId);

  if (error) {
    return {
      status: "error",
      message: `Failed to delete network: ${error.message}`,
    };
  }

  revalidatePath("/networks");
  revalidatePath("/tokens");
  return { status: "success", message: "Network deleted." };
}

// --- Universal Token Data Fetcher (Production-Grade) ---

export type FetchMetadataState = {
  status: "idle" | "success" | "error";
  message?: string;
  metadata?: TokenFetchResult;
  chainId?: string;
  contractAddress?: string;
}

const fetchMetadataSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required."),
  chainId: z.string().min(1, "Network selection is required."),
});

async function getCachedToken(contract: string, networkName: string): Promise<TokenMetadata | null> {
    const { data, error } = await supabaseAdmin
        .from("token_metadata")
        .select("*")
        .eq("contract_address", contract.toLowerCase())
        .eq("network", networkName.toLowerCase())
        .maybeSingle();
    
    if (error) {
        console.error("Error fetching cached token:", error);
        return null;
    };

    return data;
}

export async function fetchTokenMetadata(prevState: FetchMetadataState | undefined, formData: FormData): Promise<FetchMetadataState> {
    const validated = fetchMetadataSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validated.success) {
        return { status: "error", message: "Contract address and network are required." };
    }

    const { contractAddress, chainId } = validated.data;
    const forceRefresh = formData.get("forceRefresh") === "true";

    const chainConfig = chainsConfig.find(c => c.chainId.toString() === chainId);
    if (!chainConfig) {
      return { status: "error", message: "Invalid network selected." };
    }
  
    try {
      if (!forceRefresh) {
          const cached = await getCachedToken(contractAddress, chainConfig.name);
          if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL) {
              return {
                  status: "success",
                  metadata: { ...cached.token_details, logoUrl: cached.logo_url, source: `cache (${cached.source})` },
                  chainId: chainConfig.chainId.toString(),
                  contractAddress,
              };
          }
      }
      
      const metadata = await fetchTokenMetadataFromSources(contractAddress, chainConfig.name);
      
      if (metadata && metadata.symbol && metadata.name && metadata.decimals !== undefined) {
          const { data: logoResult } = await autoFetchMissingLogo({ tokenSymbol: metadata.symbol, tokenName: metadata.name });

          const result: TokenFetchResult = {
              name: metadata.name,
              symbol: metadata.symbol,
              decimals: metadata.decimals,
              logoUrl: logoResult?.logoUrl ?? getCdnLogoUrl(metadata.name, metadata.symbol),
              source: `${metadata.source} on ${chainConfig.name}`,
          };
          
          return { 
            status: "success", 
            metadata: result, 
            chainId: chainConfig.chainId.toString(),
            contractAddress 
          };
      } else {
        throw new Error("Incomplete metadata received from sources.");
      }
    } catch (error: any) {
        return { status: "error", message: `Could not find token with address ${contractAddress} on ${chainConfig.name}. Error: ${error.message}` };
    }
}
