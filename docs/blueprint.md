# **App Name**: Token Logo CDN

## Core Features:

- Logo Upload: Admin panel to upload token logos to Supabase Storage, making them publicly accessible via URLs.
- Metadata Storage: Store token metadata (name, symbol, contract address, chain, decimals, logo URL) in a Supabase database.
- Token Info Fetch: Fetch token information (name, symbol, decimals) from the blockchain using the contract address.
- Logo URL Retrieval: Query the Supabase database for the logo URL using the token symbol or contract address.
- Default Logo: Serve a default logo from Supabase Storage when a specific token logo is not found.
- Missing Logo Auto-Fetch (Optional): Automatically fetch missing logos from CoinGecko using AI as a tool to incorporate images, if not already in the Supabase CDN.
- CDN Integration: Serve all image requests via a custom cdn.wevina.io subdomain, pointing at Supabase storage

## Style Guidelines:

- Primary color: Vivid blue (#29ABE2) reflecting the modern and trustworthy nature of blockchain technology.
- Background color: Light blue (#E0F7FA), providing a clean and unobtrusive backdrop.
- Accent color: Teal (#008080), complementing the primary color with a professional and calming feel.
- Body and headline font: 'Inter', a grotesque-style sans-serif for a modern and neutral look, suitable for both headlines and body text.
- Code font: 'Source Code Pro' for displaying contract addresses and code snippets.
- Simple, consistent icons for admin panel actions like upload and database management.
- Subtle loading animations when fetching token information or logos.