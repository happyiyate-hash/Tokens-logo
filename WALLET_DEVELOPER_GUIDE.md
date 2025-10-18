
# Developer Guide: Fetching Token Data Directly from Supabase

This guide provides the exact method for your wallet application to connect directly to the Supabase database to fetch token logos and metadata. This is the most direct and efficient way to get the data managed by the CDN dashboard.

### Architecture Overview

Your wallet application will act as a direct client to the Supabase database. You will use Supabase's **public API keys** to read data from two key tables:

1.  `token_logos`: The master library of all global logos.
2.  `token_metadata`: The collection of token data (like contract address and decimals) which includes a direct link to the logo's public URL.

---

### Step 1: Environment Setup for Your Wallet App

To connect your wallet app to Supabase, you must create a new environment file.

1.  In the root directory of your wallet application, create a file named **`.env.local`**.
2.  Add the following environment variables to this new file. These are the **public-facing** keys from your Supabase project, which are safe to use in a client-side application.

```env
# --- .env.local ---
# Public Supabase credentials for the wallet app.
# These keys are safe to expose in a client-side (browser) application.

# Find this in your Supabase Dashboard > Project Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"

# Find this in your Supabase Dashboard > Project Settings > API > Project API Keys > anon (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLIC_ANON_KEY"
```

---

### Step 2: Initialize the Supabase Client

In your wallet application, you need to install the Supabase JS library and initialize the client.

```bash
npm install @supabase/supabase-js
```

Then, create a file to initialize and export the client. This uses the environment variables you just set up.

```javascript
// Example file: src/lib/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// Get the variables from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in your .env.local file.");
}

// Create a single, reusable Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

---

### Step 3: How to Fetch Data (The Exact Code)

Here are the two primary functions your wallet will need. Import the `supabase` client you created above to use them.

#### A. Fetching a Specific Logo URL by Symbol and Name

To get a logo for any cryptocurrency, you query the `token_logos` table. This is the most reliable way to find a logo.

*   **Table to Query**: `token_logos`

```javascript
/**
 * Fetches a token's logo URL directly from the Supabase 'token_logos' table.
 *
 * @param {string} symbol - The symbol of the token (e.g., 'ETH').
 * @param {string} name - The name of the token (e.g., 'Ethereum') for a more precise match.
 * @returns {Promise<string|null>} A promise that resolves to the public logo URL, or null if not found.
 */
async function fetchLogoUrlByNameAndSymbol(symbol, name) {
  // .ilike() is used for case-insensitive matching, which is more robust.
  let query = supabase
    .from('token_logos') // The exact table name
    .select('public_url') // We only need the public URL
    .ilike('symbol', symbol);

  // If a name is provided, add it to the query to get a more accurate result.
  if (name) {
    query = query.ilike('name', `%${name}%`);
  }

  // Execute the query to get the first matching result.
  const { data, error } = await query.limit(1).single();

  if (error) {
    console.error('Error fetching logo from Supabase:', error.message);
    return null;
  }

  // The 'public_url' field contains the direct URL to the image in Supabase Storage.
  return data ? data.public_url : null;
}

// --- Example Usage in Wallet App ---
// fetchLogoUrlByNameAndSymbol('ETH', 'Ethereum').then(logoUrl => {
//   if (logoUrl) {
//     console.log('Found Ethereum logo:', logoUrl);
//     // Now use this URL directly in an <img> tag in your UI.
//     // For example: <img src={logoUrl} alt="Ethereum logo" />
//   }
// });
```

#### B. Fetching Full Token Metadata for a Specific Network

To get all information for a token on a specific network (name, symbol, decimals, contract address, AND the logo), you query the `token_metadata` table. The `logo_url` field in this table is already the correct, direct URL to the image.

*   **Table to Query**: `token_metadata`

```javascript
/**
 * Fetches the complete metadata for a token on a specific network.
 *
 * @param {string} network - The name of the network in lowercase (e.g., 'polygon').
 * @param {string} symbol - The symbol of the token (e.g., 'MATIC').
 * @returns {Promise<object|null>} A promise that resolves to the full token metadata object, or null if not found.
 */
async function fetchTokenMetadata(network, symbol) {
  const { data, error } = await supabase
    .from('token_metadata') // The exact table name
    .select('*') // Select all columns
    .eq('network', network.toLowerCase())
    .ilike('token_details->>symbol', symbol) // Use ->> for text search within the JSON 'token_details' column
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching token metadata from Supabase:', error.message);
    return null;
  }

  // The record 'data' contains 'logo_url', 'contract_address', and 'token_details' (which has name, symbol, decimals).
  return data;
}

// --- Example Usage in Wallet App ---
// fetchTokenMetadata('polygon', 'MATIC').then(metadata => {
//   if (metadata) {
//     console.log('Found MATIC metadata on Polygon:', metadata);
//     //
//     // You can access all details like this:
//     // const logo = metadata.logo_url;
//     // const name = metadata.token_details.name;
//     // const decimals = metadata.token_details.decimals;
//     // const contract = metadata.contract_address;
//     //
//     // Now use all this information in your wallet UI.
//   }
// });
```

This guide provides everything needed to integrate your wallet directly with the Supabase backend.
