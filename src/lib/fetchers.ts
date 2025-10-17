
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";

const ERC20_MIN_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

export async function fetchTokenMetadataFromSources(contractAddress: string, networkName: string): Promise<Partial<TokenFetchResult>> {
    const chain = findChainByName(networkName);
    if (!chain) throw new Error(`Unsupported network: ${networkName}`);
    
    // 1. Try Block Explorer First (now using the correct endpoint for each chain)
    try {
        const params = {
            module: "token",
            action: "tokeninfo",
            contractaddress: contractAddress,
            apikey: process.env.ETHERSCAN_API_KEY || "",
        };

        const { data } = await axios.get(chain.explorerApi, { params, timeout: 8000 });
        
        // Etherscan-like APIs return `result` which can be an array or object.
        if (data && data.result) {
            // Handle cases where result is an array or a single object
            const tokenInfo = Array.isArray(data.result) ? data.result[0] : data.result;

            if (tokenInfo) {
                // Explorer APIs have inconsistent naming, so we check multiple possibilities
                const name = decodeBytes32(tokenInfo.tokenName || tokenInfo.name);
                const symbol = decodeBytes32(tokenInfo.symbol);
                const decimals = tokenInfo.decimals !== undefined && tokenInfo.decimals !== null 
                                 ? Number(tokenInfo.decimals) 
                                 : undefined;

                // If explorer returns all key fields, we are done.
                if (name && symbol && decimals !== undefined) {
                    return {
                        name,
                        symbol,
                        decimals,
                        source: "explorer"
                    };
                }
            }
        }
    } catch (e: any) {
        console.warn(`Explorer fetch failed for ${contractAddress} on ${networkName}, falling back to RPC. Error: ${e.message}`);
    }

    // 2. Fallback to RPC if explorer fails or returns partial data
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${networkName}`);
    }

    try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        const token = new ethers.Contract(contractAddress, ERC20_MIN_ABI, provider);

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
            name: name || symbol || "Unknown",
            symbol: symbol || name || "???",
            decimals: decimals ?? 18, // Default to 18 if decimals are not found
            source: "rpc"
        };
    } catch (e: any) {
        console.error(`RPC fallback failed for ${contractAddress} on ${networkName}:`, e.message);
        throw new Error("Could not fetch complete token metadata from any source.");
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
