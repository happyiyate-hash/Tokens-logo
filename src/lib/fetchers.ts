import { ethers } from "ethers";
import { supabaseAdmin } from "./supabase/admin";
import chainsConfig from "@/lib/chains.json";
import axios from "axios";

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

export async function fetchFromExplorer(contract: string, networkName: string): Promise<Partial<{ name: string, symbol: string, decimals: number, totalSupply: string, source: string }> | null> {
  const chain = findChainByName(networkName);
  if (!chain || !chain.explorerApi) return null;
  
  const apiKey = process.env.ETHERSCAN_API_KEY; // Use a generic key name
  if (!apiKey) {
      console.warn("ETHERSCAN_API_KEY environment variable is not set. Explorer fetch will likely fail.");
  }

  const url = `${chain.explorerApi}?module=token&action=tokeninfo&contractaddress=${contract}&apikey=${apiKey}`;
  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    if (data.status === "0" || !data.result || data.result.length === 0) {
        console.warn(`Explorer API returned error for ${contract} on ${networkName}: ${data.message || data.result}`);
        return null;
    }
    const t = data.result[0];
    return {
      name: t.tokenName || t.name || null,
      symbol: t.symbol || null,
      decimals: t.decimals ? Number(t.decimals) : null,
      totalSupply: t.totalSupply ? String(t.totalSupply) : null,
      source: "explorer"
    };
  } catch (e: any) {
    console.error(`Explorer fetch failed for ${contract} on ${networkName}:`, e.message);
    return null;
  }
}

export async function fetchFromRpc(contract: string, rpcUrl: string): Promise<Partial<{ name: string, symbol: string, decimals: number, totalSupply: string, source: string }> | null> {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const token = new ethers.Contract(contract, ERC20_ABI, provider);
    const [name, symbol, decimals, totalSupply] = await Promise.allSettled([
      token.name(), token.symbol(), token.decimals(), token.totalSupply()
    ]);
    return {
      name: name.status === "fulfilled" ? name.value : null,
      symbol: symbol.status === "fulfilled" ? symbol.value : null,
      decimals: decimals.status === "fulfilled" ? Number(decimals.value) : null,
      totalSupply: totalSupply.status === "fulfilled" ? String(totalSupply.value) : null,
      source: "rpc"
    };
  } catch (e: any) {
    console.error(`RPC fetch failed for ${contract} at ${rpcUrl}:`, e.message);
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
    return null; // Don't log, as 404s are expected
  }
}

export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = process.env.COINGECKO_API_URL || "https://api.coingecko.com/api/v3";
  try {
    const { data: searchData } = await axios.get(`${coingeckoApiUrl}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    
    // Prioritize exact symbol match
    const exactMatch = coins.find((c: any) => c.symbol && c.symbol.toLowerCase() === symbol.toLowerCase());
    const coinToFetch = exactMatch || coins[0]; // Fallback to the first result
    
    if (!coinToFetch || !coinToFetch.id) return null;
    
    // Fetch details to get the image
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
