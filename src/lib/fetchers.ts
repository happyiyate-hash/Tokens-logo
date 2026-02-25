
"use server";

import axios from "axios";
import type { TokenFetchResult } from "@/lib/types";
import pRetry from 'p-retry';
import chainsConfig from "@/lib/chains.json";

// This is the new function that ONLY uses the Etherscan V2 API structure.
async function fetchFromEtherscanV2(chainId: number, contractAddress: string): Promise<Partial<TokenFetchResult>> {
    const apiKey = process.env.ETHERSCAN_V2_API_KEY;
    if (!apiKey) {
        throw new Error("Etherscan API key is not configured in environment variables (ETHERSCAN_V2_API_KEY).");
    }

    const chain = chainsConfig.find(c => c.chainId === chainId);
    if (!chain || !chain.explorerApi) {
        throw new Error(`Explorer API endpoint not configured for chain ID ${chainId}.`);
    }

    // The baseUrl is now the unified V2 endpoint.
    const baseUrl = chain.explorerApi;
    
    const params = {
        // **BUG FIX**: The chainid parameter was missing from the request.
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
                console.warn(`Explorer API attempt ${error.attemptNumber} failed for chain ${chainId}. Retries left: ${error.retriesLeft}.`);
            }
        });

        const { data } = response;

        // Check for common error patterns from Etherscan-like APIs
        if (data.status === "0" || (data.message && !data.message.includes("OK"))) {
            const errorMessage = typeof data.result === 'string' ? data.result : data.message;
            throw new Error(`Explorer API Error: ${errorMessage}`);
        }
        
        // Etherscan V2 returns an array for tokeninfo
        const tokenInfo = data.result[0];
        
        if (!tokenInfo || !tokenInfo.symbol || !tokenInfo.name) {
            throw new Error("Incomplete token data received from Explorer API.");
        }

        return {
            name: tokenInfo.name,
            symbol: tokenInfo.symbol,
            decimals: Number(tokenInfo.decimals) || 18, // Fallback to 18 if decimals is missing/falsy
            source: `Etherscan V2 API (${chain.name})`
        };

    } catch (e: any) {
        console.error(`Explorer API call failed for ${contractAddress} on chain ${chainId} using ${baseUrl}:`, e.message);
        throw new Error(`Could not fetch token details from Etherscan API. Ensure the address is valid and the network is supported.`);
    }
}

async function getCoinGeckoIdByName(tokenName: string, tokenSymbol: string): Promise<string | null> {
    try {
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(tokenName)}`;
        const { data: searchData } = await pRetry(() => axios.get(searchUrl, { timeout: 5000 }), { retries: 1 });
        
        if (searchData.coins && searchData.coins.length > 0) {
            const exactMatch = searchData.coins.find((c: any) => c.symbol?.toLowerCase() === tokenSymbol.toLowerCase());
            if (exactMatch) return exactMatch.id;
            return searchData.coins[0].id; // Fallback to first result
        }
        return null;
    } catch (e) {
        console.warn(`CoinGecko search by name failed for ${tokenName}:`, e);
        return null;
    }
}


export async function fetchTokenMetadataFromSources(contractAddress: string, chainId: number): Promise<Partial<TokenFetchResult>> {
    // Step 1: Get base metadata (name, symbol, decimals) from an explorer
    const baseMetadata = await fetchFromEtherscanV2(chainId, contractAddress);
    
    if (!baseMetadata.name || !baseMetadata.symbol) {
        throw new Error("Could not fetch base metadata (name, symbol) from explorer.");
    }

    // Step 2: Auto-detect Price ID and Source (from CoinGecko)
    const chain = chainsConfig.find(c => c.chainId === chainId);
    const coingeckoPlatformId = chain?.cgPlatform;
    let priceId: string | null = null;
    let priceSource: string | null = null;

    // First, try the most reliable method: lookup by contract on the specific platform
    if (coingeckoPlatformId) {
        try {
            const { data: cgData } = await pRetry(() => axios.get(`https://api.coingecko.com/api/v3/coins/${coingeckoPlatformId}/contract/${contractAddress.toLowerCase()}`), { retries: 1 });
            if (cgData.id) {
                priceId = cgData.id;
                priceSource = 'coingecko';
            }
        } catch (e) {
            console.warn(`CoinGecko lookup by contract for ${contractAddress} failed, falling back to search by name.`);
        }
    }

    // If contract lookup fails or is not possible, fall back to searching by name
    if (!priceId) {
        const foundId = await getCoinGeckoIdByName(baseMetadata.name, baseMetadata.symbol);
        if (foundId) {
            priceId = foundId;
            priceSource = 'coingecko';
        }
    }

    return {
        ...baseMetadata,
        priceId: priceId ?? undefined,
        priceSource: priceSource ?? 'unknown',
    };
}


export async function fetchLogoFromCoinGeckoBySymbol(symbol: string): Promise<string | null> {
  const coingeckoApiUrl = "https://api.coingecko.com/api/v3";
  try {
    const { data: searchData } = await axios.get(`${coingeckoApiUrl}/search?query=${encodeURIComponent(symbol)}`, { timeout: 8000 });
    const coins = searchData.coins || [];
    
    // Prioritize an exact symbol match to avoid ambiguity (e.g., "ETH")
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
