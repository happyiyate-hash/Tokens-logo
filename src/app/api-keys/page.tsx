
"use client";

import { useState } from "react";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const walletGuideCode = `
// --- .env.local ---
// Public Supabase credentials for the wallet app.
// These keys are safe to expose in a client-side (browser) application.

// Find this in your Supabase Dashboard > Project Settings > API > Project URL
NEXT_PUBLIC_SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"

// Find this in your Supabase Dashboard > Project Settings > API > Project API Keys > anon (public)
NEXT_PUBLIC_SUPABASE_ANON_KEY="YOUR_SUPABASE_PUBLIC_ANON_KEY"
`;

const walletGuideCode2 = `
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
`;

const walletGuideCode3 = `
/**
 * Fetches the complete metadata for all tokens on a specific network.
 * This is the primary function to get all data for a chain.
 *
 * @param {string} network - The name of the network in lowercase (e.g., 'polygon').
 * @returns {Promise<Array<object>|null>} A promise that resolves to a list of full token metadata objects, or null on error.
 */
async function fetchAllTokenMetadataForNetwork(network) {
  const { data, error } = await supabase
    .from('token_metadata') // The exact table name
    .select('*') // Select all columns
    .eq('network', network.toLowerCase());

  if (error) {
    console.error('Error fetching all token metadata from Supabase:', error.message);
    return null;
  }
  
  // The 'data' variable is now an array of all token records for the network.
  // Each record contains 'logo_url', 'contract_address', and 'token_details' (which has name, symbol, decimals).
  // You can now store this array in your wallet's local storage for instant access.
  return data;
}

// --- Example Usage in Wallet App ---
// This would run when your wallet app starts up for each supported network.
// fetchAllTokenMetadataForNetwork('polygon').then(allPolygonTokens => {
//   if (allPolygonTokens) {
//     console.log('Fetched all tokens for Polygon:', allPolygonTokens);
//     // Now, save 'allPolygonTokens' to the device's local storage
//     // so you don't have to fetch it again until you want to refresh.
//     // For example:
//     // localStorage.setItem('polygon-tokens', JSON.stringify(allPolygonTokens));
//   }
// });
`;


function CodeSnippet({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative">
      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm font-code">
        <code>{code.trim()}</code>
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2"
        onClick={handleCopy}
        title="Copy code"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}


export default function ApiKeysPage() {

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Direct Database Integration Guide
        </h1>
        <p className="text-muted-foreground">
          Your guide for connecting external wallets directly to the Supabase database to fetch token metadata.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Integrate: The Direct Database Method</CardTitle>
          <CardDescription>
            This guide provides the exact method for your wallet application to connect directly to the Supabase database to fetch all necessary token data. This is the most efficient way to sync with the data managed by your CDN dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <Accordion type="single" collapsible className="w-full" defaultValue="step-1">
                <AccordionItem value="step-1">
                    <AccordionTrigger className="text-lg font-medium">Step 1: Set Up Environment</AccordionTrigger>
                    <AccordionContent className="prose prose-invert max-w-none text-muted-foreground space-y-4">
                        <p>In the root directory of your wallet application, create a file named <strong>`.env.local`</strong> and add the public-facing keys from your Supabase project. These keys are safe to use in a client-side application.</p>
                        <CodeSnippet code={walletGuideCode} />
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="step-2">
                    <AccordionTrigger className="text-lg font-medium">Step 2: Initialize Supabase Client</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                        <p className="text-muted-foreground">Install the Supabase JS library in your wallet project (`npm install @supabase/supabase-js`) and use the code below to create a reusable client.</p>
                        <div className="space-y-2">
                            <h4 className="font-semibold text-card-foreground">Code to Initialize</h4>
                            <CodeSnippet code={walletGuideCode2} />
                        </div>
                    </AccordionContent>
                </AccordionItem>

                 <AccordionItem value="step-3" className="border-b-0">
                    <AccordionTrigger className="text-lg font-medium">Step 3: Fetch All Token Metadata</AccordionTrigger>
                    <AccordionContent className="space-y-6">
                        <p className="text-muted-foreground">This is the most important function. It queries the `token_metadata` table to get a complete list of all tokens for a specific network. Your wallet should run this function for each supported network when it starts up and cache the results locally on the user's device.</p>
                         <div className="space-y-2">
                            <h4 className="font-semibold text-card-foreground">Code to Fetch Data</h4>
                            <CodeSnippet code={walletGuideCode3} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>Web API Keys (For Other Services)</CardTitle>
            <CardDescription>
                While your wallet uses direct database access, you can generate Web API keys here for other services or applications that may need to access your CDN via standard HTTP endpoints.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <ApiKeyManager />
        </CardContent>
      </Card>
    </div>
  );
}
