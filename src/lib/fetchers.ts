
"use server";

import { ethers } from "ethers";
import { supabaseAdmin } from "./supabase/admin";
import chainsConfig from "@/lib/chains.json";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

export async function fetchFromExplorer(contract: string, networkName: string): Promise<Partial<TokenFetchResult> | null> {
  const chain = findChainByName(networkName);
  if (!chain || !chain.explorerApi) return null;
  
  const apiKey = process.env.ETHERSCAN_API_KEY;
  if (!apiKey) {
      console.warn("ETHERSCAN_API_KEY environment variable is not set. Explorer fetch will likely fail.");
  }

  const url = `${chain.explorerApi}?module=token&action=tokeninfo&contractaddress=${contract}&apikey=${apiKey}`;
  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    
    if (data.status === "0" || !data.result || (Array.isArray(data.result) && data.result.length === 0)) {
        console.warn(`Explorer API returned error or empty result for ${contract} on ${networkName}: ${data.message || data.result}`);
        return null;
    }
    
    const t = Array.isArray(data.result) ? data.result[0] : data.result;

    if (!t.symbol && !t.name) {
        console.warn(`Explorer API response for ${contract} on ${networkName} is missing both symbol and name.`);
        return null;
    }

    return {
      name: t.name || t.tokenName || undefined,
      symbol: t.symbol || undefined,
      decimals: t.decimals ? Number(t.decimals) : undefined,
      source: "explorer"
    };
  } catch (e: any) {
    console.error(`Explorer fetch failed for ${contract} on ${networkName}:`, e.message);
    return null;
  }
}

export async function fetchFromRpc(contract: string, rpcUrl: string): Promise<Partial<TokenFetchResult> | null> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(contract, ERC20_ABI, provider);
    
    const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
      token.name(), 
      token.symbol(), 
      token.decimals()
    ]);
    
    const name = nameResult.status === 'fulfilled' ? decodeBytes32(nameResult.value) : undefined;
    const symbol = symbolResult.status === 'fulfilled' ? decodeBytes32(symbolResult.value) : undefined;
    const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : undefined;

    if (!name && !symbol) {
        throw new Error("Could not fetch name or symbol from RPC.");
    }

    return {
      name,
      symbol,
      decimals: decimals ?? 18, // Default to 18 if decimals fails
      source: "rpc"
    };
  } catch (e: any) {
    console.warn(`RPC fetch failed for ${contract} at ${rpcUrl}:`, e.message);
    return null;
  }
}

export async function fetchLogoFromCoinGeckoByContract(contract: string, platform: string): Promise<string | null> {
  const coingeckoApiUrl = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
  try {
    const url = `${coingeckoApiUrl}/coins/${platform}/contract/${contract.toLowerCase()}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    return data?.image?.large || data?.image?.small || data?.image?.thumb || null;
  } catch (e) {
    return null;
  }
}

export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
  try {
    const { data: searchData } = await axios.get(`${coingeckoApiUrl}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    
    const exactMatch = coins.find((c: any) => c.symbol && c.symbol.toLowerCase() === symbol.toLowerCase());
    const coinToFetch = exactMatch || coins[0];
    
    if (!coinToFetch || !coinToFetch.id) return null;
    
    const { data: details } = await axios.get(`${coingeckoApiUrl}/coins/${coinToFetch.id}`);
    return details?.image?.large || details?.image?.small || details?.image?.thumb || null;
  } catch (e: any) {
    console.error(`CoinGecko search failed for symbol ${symbol}:`, e.message);
    return null;
  }
}

export async function uploadLogo(logoFile: File, contract: string, networkName: string): Promise<{ storage_path: string; public_url: string } | null> {
    if (!logoFile || logoFile.size === 0) return null;

    const fileContents = await logoFile.arrayBuffer();
    const ext = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
    const filename = `${contract.toLowerCase()}_${networkName.toLowerCase()}.${ext}`;
    const path = `${networkName.toLowerCase()}/${filename}`;


    const { error: uploadError } = await supabaseAdmin.storage
      .from("token_logos")
      .upload(path, fileContents, {
        contentType: logoFile.type,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Storage error: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("token_logos")
      .getPublicUrl(path);

    if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded logo.");
    }

    return { storage_path: path, public_url: publicUrlData.publicUrl };
}

export async function uploadLogoFromBuffer(network: string, key: string, imageBuffer: ArrayBuffer, contentType="image/png"): Promise<string> {
  const path = `${network}/${key}`;
  const { data, error } = await supabaseAdmin.storage.from("token_logos").upload(path, imageBuffer, { contentType, upsert: true });
  if (error) throw error;
  
  const { data: publicUrlData } = supabaseAdmin.storage.from("token_logos").getPublicUrl(path);

  if (!publicUrlData) {
      throw new Error("Could not get public URL for the uploaded logo.");
  }
  
  const { publicUrl } = publicUrlData;
  
  return publicUrl;
}
