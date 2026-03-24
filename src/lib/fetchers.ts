
"use server";

import axios from "axios";
import { ethers } from "ethers";
import type { TokenFetchResult } from "@/lib/types";
import pRetry from 'p-retry';
import chainsConfig from "@/lib/chains.json";
import { decodeBytes32 } from "@/lib/hextools";

// Minimal ABI to get token details
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)"
];

// Simple in-memory cache to avoid spamming RPCs for the same address during a session.
const cache: Record<string, TokenFetchResult> = {};

/**
 * Tries to fetch token data from a single network's RPC.
 * @param contractAddress The address of the ERC20 token contract.
 * @param rpcUrl The RPC URL for the blockchain.
 * @returns An object with success status and token data if found.
 */
async function tryNetwork(contractAddress: string, rpcUrl: string): Promise<{ success: boolean; data?: Omit<TokenFetchResult, 'price' | 'logoUrl' | 'verified' > }> {
  if (rpcUrl.includes('YOUR_INFURA_KEY') || rpcUrl.includes('YOUR_API_KEY')) {
    console.warn(`Skipping RPC with unconfigured API key: ${rpcUrl}`);
    return { success: false };
  }

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);

    const [name, symbol, decimals, totalSupply] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
      contract.totalSupply()
    ]);
    
    const decodedName = decodeBytes32(name);
    const decodedSymbol = decodeBytes32(symbol);

    if (!decodedName || !decodedSymbol || decodedSymbol.length > 12) {
      return { success: false };
    }

    return {
      success: true,
      data: {
        name: decodedName,
        symbol: decodedSymbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
      }
    };
  } catch (err) {
    return { success: false };
  }
}

/**
 * Fetches logo and price from CoinGecko using a coin ID.
 * @param coinId The CoinGecko coin ID (e.g., "ethereum").
 * @returns An object with the logo URL and USD price.
 */
async function getCoinGeckoExtras(coinId: string): Promise<{ logo?: string; price?: number }> {
    if (!coinId) return {};
    try {
        const { data } = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}`);
        return {
            logo: data.image?.large,
            price: data.market_data?.current_price?.usd
        };
    } catch (e) {
        console.warn(`Could not fetch extras for CoinGecko ID ${coinId}`);
        return {};
    }
}

/**
 * The main orchestrator function for detecting and fetching token metadata.
 * It iterates through configured networks, finds the token, and enriches it with CoinGecko data.
 * @param contractAddress The address of the token contract.
 * @returns A full TokenFetchResult containing all aggregated data.
 */
export async function detectAndFetchTokenMetadata(contractAddress: string): Promise<TokenFetchResult> {
  const WNC_ADDRESS = "0xF870f995EA97BCff1Cc5f420854a1B252D1BD5E3";
  const lowercasedAddress = contractAddress.toLowerCase();

  if (cache[lowercasedAddress]) {
    return { ...cache[lowercasedAddress], source: 'cache' };
  }

  if (lowercasedAddress === WNC_ADDRESS.toLowerCase()) {
    const result = {
      name: "WevinaCoin",
      symbol: "WNC",
      decimals: 18,
      networkName: "Polygon",
      chainId: 137,
      verified: true,
      logoUrl: "/wnc-logo.png",
      price: 0.01, // Example price
      source: 'Hardcoded'
    };
    cache[lowercasedAddress] = result;
    return result;
  }

  if (!ethers.utils.isAddress(contractAddress)) {
    throw new Error("Invalid contract address format.");
  }

  for (const chain of chainsConfig) {
    const result = await tryNetwork(contractAddress, chain.rpc);

    if (result.success && result.data) {
      let verified = false;
      let logoUrl: string | undefined;
      let price: number | undefined;
      let priceSource: string | undefined;
      let priceId: string | undefined;

      // Now, enrich with CoinGecko data
      try {
        const cgUrl = `https://api.coingecko.com/api/v3/coins/${chain.cgPlatform}/contract/${lowercasedAddress}`;
        const { data: cgData } = await pRetry(() => axios.get(cgUrl), { retries: 1 });
        
        if (cgData.id) {
            verified = true;
            priceId = cgData.id;
            priceSource = 'coingecko';
            const extras = await getCoinGeckoExtras(cgData.id);
            logoUrl = extras.logo;
            price = extras.price;
        }
      } catch (e) {
        console.warn(`CoinGecko verification failed for ${contractAddress} on ${chain.name}. Token will be marked as unverified.`);
      }

      const finalResult: TokenFetchResult = {
        ...result.data,
        networkName: chain.name,
        chainId: chain.chainId,
        verified,
        logoUrl,
        price,
        priceId,
        priceSource,
        source: `RPC (${chain.name}) + CoinGecko`
      };
      
      cache[lowercasedAddress] = finalResult;
      return finalResult;
    }
  }

  throw new Error("Token not found on any supported networks.");
}

/**
 * This function is now a wrapper around the new detection logic to maintain compatibility
 * with the original server action call structure, though it's now simplified.
 * @param contractAddress The address of the token contract.
 * @returns A partial TokenFetchResult containing the aggregated data.
 */
export async function fetchTokenMetadataFromSources(contractAddress: string): Promise<Partial<TokenFetchResult>> {
    return detectAndFetchTokenMetadata(contractAddress);
}


/**
 * Fetches a token's logo URL from CoinGecko using its symbol.
 * This is used by the AI flow as a tool to find missing logos.
 * @param symbol The symbol of the token (e.g., "WETH").
 * @returns The URL of the logo, or null if not found.
 */
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
