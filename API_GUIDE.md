# Developer API Guide: Direct Supabase Access

This document explains how to connect your external application (e.g., a crypto wallet) directly to the Supabase database to fetch token metadata and logos in the most performant way.

**Important**: This method requires you to have the Supabase Project URL and the public `anon` key. The application owner will provide these to you.

## 1. Setup: Connecting to Supabase

First, install the Supabase client library in your JavaScript/TypeScript project:
```bash
npm install @supabase/supabase-js
```

Then, initialize the client. You only need to do this once in your application.

```javascript
import { createClient } from '@supabase/supabase-js';

// Get these values from the application owner
const supabaseUrl = 'YOUR_SUPABASE_URL_HERE';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY_HERE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

## 2. Fetching All Tokens for a Network (The FAST and CORRECT Way)

This is the most efficient and recommended way to get a list of all supported tokens for a given blockchain network. It includes pre-linked, cached logo URLs for instant loading and prevents data mix-ups between networks. Your wallet should call this function for each network it supports (e.g., on startup) and cache the results locally.

-   **Table**: `token_metadata`
-   **Input**: `networkName` (string, e.g., `polygon`, `ethereum`). This is case-insensitive.

### Example Code

```javascript
/**
 * Fetches all tokens for a given network directly from Supabase.
 * This is the recommended and fastest method to prevent data mix-ups and ensure fast logo loading.
 *
 * @param {object} supabase - An initialized Supabase client instance.
 * @param {string} networkName - The name of the network (e.g., 'polygon', 'eth', 'bsc').
 * @returns {Promise<Array<object>|null>} A list of token objects or null on error.
 */
async function getAllTokensForNetwork(supabase, networkName) {
  const { data, error } = await supabase
    .from('token_metadata')
    .select('token_details, contract_address, network, logo_url')
    .eq('network', networkName.toLowerCase());

  if (error) {
    console.error(`Error fetching tokens for ${networkName}:`, error);
    return null;
  }

  if (!data) return [];

  // The 'token_details' field is a JSON object, so we flatten it for easier use.
  return data.map(token => ({
    symbol: token.token_details.symbol,
    name: token.token_details.name,
    decimals: token.token_details.decimals,
    network: token.network,
    contract: token.contract_address,
    logo_url: token.logo_url, // This is a RELATIVE path, see note below.
    priceSource: token.token_details.priceSource, // e.g., "coingecko"
    priceId: token.token_details.priceId,       // e.g., "wrapped-bitcoin"
  }));
}

// --- Example Usage ---
// This is the base URL where THIS Token CDN application is hosted.
// Your wallet app MUST know this URL.
// const cdnAppBaseUrl = 'https://your-cdn-app-domain.com'; 

// getAllTokensForNetwork(supabase, 'polygon').then(tokens => {
//   if (tokens) {
//     console.log('Fetched Polygon tokens:', tokens);
    
//     // Correctly construct the full logo URL before using it in an <img> tag.
//     const firstToken = tokens[0];
//     const fullLogoUrl = cdnAppBaseUrl + firstToken.logo_url;
//     console.log('Full, working logo URL:', fullLogoUrl);
//   }
// });
```

### **CRITICAL NOTE: How to Render Logos Correctly (The Fast Way)**

The `logo_url` returned by the function above is a **relative path** that points to this CDN application's fast caching layer (e.g., `/api/cdn/logo/wrapped-bitcoin/wbtc`). **This is intentional and is the key to instant logo loading.**

To use this URL in your wallet's `<img>` tags, you **MUST** prepend the base URL of this main Token CDN application. Using the relative path directly in your wallet app will result in a broken image because your app doesn't know what server to ask.

**Example:**
If this Token CDN application is hosted at `https://my-token-cdn.com`, the full, fast image URL would be:
`https://my-token-cdn.com/api/cdn/logo/wrapped-bitcoin/wbtc`

**Do not try to fetch the logo directly from the Supabase Storage URL.** Using the provided `logo_url` path combined with the CDN app's domain is the only way to guarantee you are using the high-speed cache, making your wallet app's logos load instantly.
