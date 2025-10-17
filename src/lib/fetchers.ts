
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

function findChainByName(name: string) {
    return chainsConfig.find(c => c.name.toLowerCase().includes(String(name).toLowerCase()));
}

export async function fetchFromExplorer(contract: string, networkName: string): Promise<Partial<{ name: string, symbol: string, decimals: number, totalSupply: string, source: string }> | null> {
  const chain = findChainByName(networkName);
  if (!chain || !chain.explorerApi) return null;
  const url = `${chain.explorerApi}?module=token&action=tokeninfo&contractaddress=${contract}&apikey=${process.env.ETHERSCAN_API_KEY}`;
  try {
    const { data } = await axios.get(url, { timeout: 8000 });
    if (!data || !data.result || data.result.length === 0) return null;
    const t = data.result[0];
    return {
      name: t.tokenName || t.name || null,
      symbol: t.symbol || null,
      decimals: t.decimals ? Number(t.decimals) : null,
      totalSupply: t.totalSupply ? String(t.totalSupply) : null,
      source: "explorer"
    };
  } catch (e) {
    console.error(`Explorer fetch failed for ${contract} on ${networkName}:`, e);
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
  } catch (e) {
    console.error(`RPC fetch failed for ${contract} at ${rpcUrl}:`, e);
    return null;
  }
}

export async function fetchLogoFromCoinGeckoByContract(contract: string, platform: string): Promise<string | null> {
  try {
    const url = `${process.env.COINGECKO_API_URL}/coins/${platform}/contract/${contract.toLowerCase()}`;
    const { data } = await axios.get(url, { timeout: 8000 });
    return data?.image?.large || data?.image?.thumb || null;
  } catch (e) {
    return null;
  }
}

export async function searchLogoBySymbol(symbol: string): Promise<string | null> {
  try {
    const { data: searchData } = await axios.get(`${process.env.COINGECKO_API_URL}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    const exact = coins.find((c: any) => c.symbol && c.symbol.toLowerCase() === symbol.toLowerCase());
    const pick = exact || coins[0];
    if (!pick) return null;
    
    const { data: details } = await axios.get(`${process.env.COINGECKO_API_URL}/coins/${pick.id}`);
    return details?.image?.large || details?.image?.thumb || null;
  } catch (e) {
    return null;
  }
}

export async function fetchLogoFromCoinGecko(contract: string, symbol: string, chain: any): Promise<string | null> {
    if (chain.cgPlatform) {
        const logo = await fetchLogoFromCoinGeckoByContract(contract, chain.cgPlatform);
        if (logo) return logo;
    }
    if (symbol) {
        const logo = await searchLogoBySymbol(symbol);
        if (logo) return logo;
    }
    return null;
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
