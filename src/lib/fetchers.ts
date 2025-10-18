
"use server";

import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import pRetry from 'p-retry';

// This is the new function that ONLY uses the Etherscan V2 API.
async function fetchFromEtherscanV2(chainId: number, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    const apiKey = process.env.ETHERSCAN_API_KEY;
    if (!apiKey) {
        throw new Error("Etherscan API key is not configured in environment variables (ETHERSCAN_API_KEY).");
    }

    const baseUrl = "https://api.etherscan.io/v2/api";
    
    const params = {
        chainid: chainId,
        module: "token",
        action: "tokeninfo",
        contractaddress: contractAddress,
        apikey: apiKey,
    };

    try {
        const response = await pRetry(() => axios.get(baseUrl, { params, timeout: 10000 }), {
            retries: 2,
            minTimeout: 500,
            onFailedAttempt: error => {
                console.warn(`Etherscan API attempt ${error.attemptNumber} failed for chain ${chainId}. Retries left: ${error.retriesLeft}.`);
            }
        });

        const { data } = response;

        if (data.status === "0" || data.message !== "OK") {
            const errorMessage = typeof data.result === 'string' ? data.result : data.message;
            throw new Error(`Etherscan API Error: ${errorMessage}`);
        }
        
        const tokenInfo = data.result[0];
        
        if (!tokenInfo || !tokenInfo.symbol || !tokenInfo.name) {
            throw new Error("Incomplete token data received from Etherscan API.");
        }

        return {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: Number(tokenInfo.decimals) || 18,
            source: `Etherscan API V2`
        };

    } catch (e: any) {
        console.error(`Etherscan V2 API call failed for ${contractAddress} on chain ${chainId}:`, e.message);
        throw new Error(`Could not fetch token details from Etherscan API. Ensure the address is valid and the network is supported.`);
    }
}


export async function fetchTokenMetadataFromSources(contractAddress: string, chainId: number): Promise<Partial<TokenFetchResult>> {
    // As per your final instruction, we now ONLY use the Etherscan V2 API fetcher.
    return fetchFromEtherscanV2(chainId, contractAddress);
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

    