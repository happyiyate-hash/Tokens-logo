
"use server";

import { ethers } from "ethers";
import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import { decodeBytes32 } from "./hextools";
import chainsConfig from "@/lib/chains.json";
import pRetry from 'p-retry';

const findChainByName = (networkName: string) => {
    const lowercasedName = networkName.toLowerCase();
    return chainsConfig.find(c => c.name.toLowerCase() === lowercasedName);
};

async function fetchFromRpc(chain: any, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    if (!chain.rpc) {
        throw new Error(`No RPC URL configured for network: ${chain.name}`);
    }
    
    const standardAbi = [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)'
    ];

    try {
        const provider = new ethers.providers.JsonRpcProvider(chain.rpc);
        const token = new ethers.Contract(contractAddress, standardAbi, provider);

        const fetchWithRetry = (fn: () => Promise<any>) => pRetry(fn, { 
            retries: 2, 
            minTimeout: 500,
            onFailedAttempt: error => {
                console.warn(`Attempt ${error.attemptNumber} failed for ${contractAddress} on ${chain.name}. Retries left: ${error.retriesLeft}.`);
            }
        });

        const [nameResult, symbolResult, decimalsResult] = await Promise.allSettled([
            fetchWithRetry(() => token.name()),
            fetchWithRetry(() => token.symbol()),
            fetchWithRetry(() => token.decimals())
        ]);

        const name = nameResult.status === 'fulfilled' ? decodeBytes32(nameResult.value) : undefined;
        const symbol = symbolResult.status === 'fulfilled' ? decodeBytes32(symbolResult.value) : undefined;
        const decimals = decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : undefined;

        if (name === undefined && symbol === undefined) {
             throw new Error("Could not fetch name or symbol from RPC after retries.");
        }

        return {
            name: name || symbol || "Unknown Token",
            symbol: symbol || name || "???",
            decimals: decimals ?? 18,
            source: `rpc (${chain.name})`
        };
    } catch (e: any) {
        console.error(`RPC call failed for ${contractAddress} on ${chain.name}:`, e.message);
        throw new Error(`Could not fetch token details. Ensure the address is a valid token contract on the selected network.`);
    }
}


export async function fetchTokenMetadataFromSources(contractAddress: string, networkName: string): Promise<Partial<TokenFetchResult>> {
    const chain = findChainByName(networkName);
    if (!chain) throw new Error(`Unsupported network: ${networkName}`);
    
    // Per your direction, we now ONLY use the direct RPC fetching method. No fallbacks.
    return fetchFromRpc(chain, contractAddress);
}


export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = "https://api.coingecko.com/api/v3";
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
