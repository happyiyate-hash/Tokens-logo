
"use client";

import { useState } from "react";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { getApiKeys } from "@/lib/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

const codeSnippet = `
async function getTokenLogo(symbol: string, apiKey: string) {
  const baseUrl = window.location.origin;
  try {
    const response = await fetch(\`\${baseUrl}/api/token/\${symbol}\`, {
      headers: {
        'x-api-key': apiKey,
      }
    });
    
    if (!response.ok) {
      // If the API returns a 404 or other error, it means the token was not found
      // or the API key is invalid. The API returns a default response in this case.
      console.warn(\`Token not found for symbol: \${symbol}. Using default.\`);
      const errorData = await response.json();
      return errorData.logo_url; 
    }

    const data = await response.json();
    return data.logo_url; // This is the URL to the image on your CDN
  } catch (error) {
    console.error('Error getting logo:', error);
    // You might want to return a default placeholder logo URL here
    return 'https://picsum.photos/seed/default-logo/128/128'; 
  }
}

// Example usage:
// const usdtLogoUrl = await getTokenLogo('USDT', 'your_generated_api_key');
// if (usdtLogoUrl) {
//   const imgElement = document.createElement('img');
//   imgElement.src = usdtLogoUrl;
//   document.body.appendChild(imgElement);
// }
`;

export default function ApiKeysPage({
  searchParams,
}: {
  searchParams: { keys: string };
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeSnippet.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // This is a workaround to get initial keys since we can't await in a client component page
  const initialApiKeys = JSON.parse(searchParams.keys || "[]");

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          API Keys
        </h1>
        <p className="text-muted-foreground">
          Manage your API keys for accessing the token logo API.
        </p>
      </div>

      <ApiKeyManager initialApiKeys={initialApiKeys} />

      <Card>
        <CardHeader>
          <CardTitle>How to Integrate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Use the following Javascript function in your crypto wallet or DApp
            to fetch token logos using a generated API key.
          </p>
          <div className="relative">
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md overflow-x-auto text-sm font-code">
              <code>{codeSnippet.trim()}</code>
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
        </CardContent>
      </Card>
    </div>
  );
}
