
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { ApiKey, TokenFetchResult, TokenDetails, TokenMetadata, TokenLogo, Network } from "@/lib/types";
import chainsConfig from "@/lib/chains.json";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { fetchTokenMetadataFromSources } from "@/lib/fetchers";
import axios from 'axios';
import { autoFetchMissingLogo } from '@/ai/flows/auto-fetch-missing-logos';
import { randomUUID } from "crypto";

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
  
  const sanitizedName = name.toLowerCase().replace(/\s+/g, '-');
  const filePath = `global/${sanitizedName}-${upperCaseSymbol.toLowerCase()}.${ext}`;

  try {
      // Check if a logo with the same NAME already exists.
      const { data: existingLogo, error: fetchError } = await supabaseAdmin
        .from('token_logos')
        .select('id, storage_path')
        .ilike('name', name) 
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Database fetch error: ${fetchError.message}`);
      }

      const fileContents = await logoFile.arrayBuffer();
      
      // If an existing logo is found, remove the old file before uploading the new one
      if (existingLogo?.storage_path) {
          const { error: removeError } = await supabaseAdmin.storage
              .from(STORAGE_BUCKET)
              .remove([existingLogo.storage_path]);
          if (removeError) {
              console.warn(`Could not remove old logo file, proceeding anyway: ${removeError.message}`);
          }
      }

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

        if (logoFile) {
            if(existingLogo.storage_path) {
                const { error: removeError } = await supabaseAdmin.storage
                    .from(STORAGE_BUCKET)
                    .remove([existingLogo.storage_path]);
                
                if (removeError) {
                    console.warn(`Could not remove old logo file '${existingLogo.storage_path}', proceeding with update anyway: ${removeError.message}`);
                }
            }

            const fileContents = await logoFile.arrayBuffer();
            const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
            const sanitizedName = name.toLowerCase().replace(/\s/g, '-');
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

        const updateData = {
            name: name,
            public_url: newPublicUrl,
            storage_path: newStoragePath,
        };
        
        const { error: updateError } = await supabaseAdmin
            .from("token_logos")
            .update(updateData)
            .eq("id", logoId);

        if (updateError) {
            throw new Error(`Database update error: ${updateError.message}`);
        }
        
        // --- SYNC LOGIC ---
        // After successfully updating the token_logos table, we must sync this change.
        const cdnUrl = getCdnLogoUrl(name, symbol);
        
        // 1. Sync to token_metadata table
        const { error: metadataUpdateError } = await supabaseAdmin
            .from("token_metadata")
            .update({ logo_url: cdnUrl })
            .ilike('token_details->>name', name);
            
        if (metadataUpdateError) {
            console.warn(`Could not sync logo update to token_metadata for ${name}: ${metadataUpdateError.message}`);
        }
        
        // 2. Sync to networks table (for native currency logos like MATIC or SOL)
        const { error: networkUpdateError } = await supabaseAdmin
            .from("networks")
            .update({ logo_url: newPublicUrl })
            .eq("name", name);

        if (networkUpdateError) {
            console.warn(`Could not sync logo update to networks table for ${name}: ${networkUpdateError.message}`);
        }
        
        revalidatePath("/logos");
        revalidatePath("/tokens");
        revalidatePath("/networks");
        return { status: "success", message: "Logo updated and synced successfully!" };

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
  chainId: z.coerce.number().min(1, "Chain ID is required."),
  decimals: z.coerce.number().int().min(0).default(18),
  contract: z.string().min(1, "Contract address is required."),
  logo: z.instanceof(File).optional(),
  priceSource: z.string().optional(),
  priceId: z.string().optional(),
});


export async function addToken(
  prevState: AddTokenState | undefined,
  formData: FormData
): Promise<AddTokenState> {
  const logoFileValue = formData.get('logo');
  const validated = addTokenSchema.safeParse({
      name: formData.get('name'),
      symbol: formData.get('symbol'),
      chainId: formData.get('chainId'),
      decimals: formData.get('decimals'),
      contract: formData.get('contract'),
      priceSource: formData.get('priceSource'),
      priceId: formData.get('priceId'),
      // Ensure logo is only passed if it's a file with content
      logo: logoFileValue instanceof File && logoFileValue.size > 0 ? logoFileValue : undefined,
  });

  if (!validated.success) {
    const fieldErrors = validated.error.flatten().fieldErrors;
    const firstError = Object.values(fieldErrors)[0]?.[0];
    return { status: "error", message: firstError || "Invalid input." };
  }
  
  const { symbol, name, decimals, chainId, contract, logo: logoFile, priceSource, priceId } = validated.data;
  
  try {
    // If a logo file was manually uploaded, save it to the global library first.
    // This is the core of the user's request.
    if (logoFile) {
        const logoFormData = new FormData();
        logoFormData.append('name', name);
        logoFormData.append('symbol', symbol);
        logoFormData.append('logo', logoFile);

        // We call our existing robust 'addGlobalLogo' action.
        const addLogoState = await addGlobalLogo(undefined, logoFormData);
        if (addLogoState.status === 'error') {
            // If saving the logo fails, we stop the whole process.
            throw new Error(`Failed to save the manually uploaded logo: ${addLogoState.message}`);
        }
    }
    
    // Now, we can be sure the logo (either pre-existing or newly uploaded) is in the system.
    // We construct the final, consistent CDN URL for the metadata linking.
    const finalLogoUrl = getCdnLogoUrl(name, symbol);
    
    const network = chainsConfig.find(c => c.chainId === chainId);
    if (!network) {
      throw new Error(`Network not found for the provided Chain ID: ${chainId}.`);
    }

    const tokenDetails: TokenDetails = { 
      name, 
      symbol, 
      decimals,
      priceSource: priceSource || 'unknown',
      priceId: priceId || undefined
    };
    
    // Upsert the token metadata. It will link to the correct logo via the CDN URL.
    const { error: upsertError } = await supabaseAdmin
        .from("token_metadata")
        .upsert({ 
            contract_address: contract.toLowerCase(),
            network: network.name.toLowerCase(),
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
    console.error("[addToken Error]", e);
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
    const uuid = randomUUID();
    const newKey = `wevina_${uuid.replace(/-/g, '')}`;

    const { data, error } = await supabaseAdmin
        .from('api_clients')
        .insert({
            client_name: validated.data.name,
            api_key: newKey
        })
        .select()
        .single();
  
    if (error) {
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
        explorer_api_key_env_var: 'ETHERSCAN_V2_API_KEY' // Always use the main key
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
        .select("name, chain_id, logo_url") // Fetch existing logo_url to get storage_path
        .eq("id", networkId)
        .single();
      
      if (fetchError || !network) throw new Error("Network not found.");

      // **BUG FIX:** If an old logo exists, remove it from storage before uploading the new one.
      if (network.logo_url) {
        // We need to derive the storage path from the public URL.
        // Assuming public URLs are in the format: .../storage/v1/object/public/token_logos/networks/polygon.png
        try {
            const urlParts = new URL(network.logo_url);
            // The storage path is the part after the bucket name
            const storagePath = urlParts.pathname.split(`/${STORAGE_BUCKET}/`)[1];
            if (storagePath) {
                 const { error: removeError } = await supabaseAdmin.storage
                    .from(STORAGE_BUCKET)
                    .remove([storagePath]);
                if (removeError) {
                     console.warn(`Could not remove old network logo file '${storagePath}', proceeding anyway: ${removeError.message}`);
                }
            }
        } catch (e) {
             console.warn(`Could not parse and remove old logo URL '${network.logo_url}':`, e);
        }
      }


      const fileContents = await logoFile.arrayBuffer();
      const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const sanitizedNetworkName = network.name.toLowerCase().replace(/\s/g, '-');
      
      const networkLogoPath = `networks/${sanitizedNetworkName}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .upload(networkLogoPath, fileContents, { contentType: logoFile.type, upsert: true });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(networkLogoPath);

      const { error: dbUpdateError } = await supabaseAdmin
        .from("networks")
        .update({ logo_url: publicUrlData.publicUrl })
        .eq("id", networkId);

      if (dbUpdateError) throw new Error(`Database update for network logo failed: ${dbUpdateError.message}`);

      const chainConfig = chainsConfig.find(c => c.chainId === network.chain_id);
      if (chainConfig && chainConfig.nativeCurrencySymbol) {
        
          const globalLogoData = {
              symbol: chainConfig.nativeCurrencySymbol,
              name: network.name,
              public_url: publicUrlData.publicUrl,
              storage_path: networkLogoPath,
          };

          const { error: globalUpsertError } = await supabaseAdmin
            .from("token_logos")
            .upsert(globalLogoData, { onConflict: 'name, symbol' });

          if (globalUpsertError) {
              console.error(`Failed to upsert global logo for ${network.name}: ${globalUpsertError.message}`);
          }
      }

      revalidatePath("/networks");
      revalidatePath("/logos");
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
}

const fetchMetadataSchema = z.object({
  contractAddress: z.string().min(1, "Contract address is required."),
  chainId: z.coerce.string().min(1, "Network selection is required."),
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
    const numericChainId = Number(chainId);

    const network = chainsConfig.find(c => c.chainId === numericChainId);

    if (!network) {
      return { status: "error", message: "Invalid network selected." };
    }
  
    try {
      if (!forceRefresh) {
          const cached = await getCachedToken(contractAddress, network.name);
          if (cached && (Date.now() - new Date(cached.fetched_at).getTime()) < CACHE_TTL) {
              const metadata: TokenFetchResult = {
                ...cached.token_details,
                logoUrl: cached.logo_url,
                source: `cache (${cached.source})`
              };
              return { status: "success", metadata };
          }
      }
      
      const metadata = await fetchTokenMetadataFromSources(contractAddress, numericChainId);
      
      if (metadata && metadata.symbol && metadata.name && metadata.decimals !== undefined) {
          // Check our internal DB for a logo first.
          const { data: dbLogo } = await supabaseAdmin
            .from('token_logos')
            .select('public_url')
            .ilike('name', metadata.name)
            .limit(1)
            .single();

          let finalLogoUrl = dbLogo?.public_url || null;

          // If no logo is found in our DB, try the AI fetcher.
          if (!finalLogoUrl) {
              const { logoUrl: aiLogoUrl } = await autoFetchMissingLogo({ tokenSymbol: metadata.symbol, tokenName: metadata.name });
              finalLogoUrl = aiLogoUrl;
          }

          // If still no logo, we fall back to the CDN-generated URL structure.
          if (!finalLogoUrl) {
              finalLogoUrl = getCdnLogoUrl(metadata.name, metadata.symbol);
          }

          const result: TokenFetchResult = {
              name: metadata.name,
              symbol: metadata.symbol,
              decimals: metadata.decimals,
              logoUrl: finalLogoUrl,
              source: `${metadata.source}`,
              priceId: metadata.priceId,
              priceSource: metadata.priceSource,
          };
          
          return { 
            status: "success", 
            metadata: result, 
          };
      } else {
        throw new Error("Incomplete metadata received from sources.");
      }
    } catch (error: any) {
        return { status: "error", message: `Could not find token with address ${contractAddress} on ${network.name}. Error: ${error.message}` };
    }
}
