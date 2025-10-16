"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { generateNewApiKey, deleteApiKey } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Copy, Check, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import type { ApiKey } from "@/lib/types";

type ApiKeyManagerProps = {
  initialApiKeys: ApiKey[];
};

export function ApiKeyManager({ initialApiKeys }: ApiKeyManagerProps) {
  const [generateState, generateAction] = useFormState(generateNewApiKey, {
    status: "idle",
  });
  const [deleteState, deleteAction] = useFormState(deleteApiKey, {
    status: "idle",
  });
  
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Generate New API Key</CardTitle>
          <CardDescription>
            Create a new API key to access your token logo service.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={generateAction} className="flex items-end gap-4">
            <div className="flex-grow">
              <Label htmlFor="newKeyName">Key Name / Description</Label>
              <Input
                id="newKeyName"
                name="name"
                placeholder="e.g., My Crypto Wallet"
                required
              />
            </div>
            <SubmitButton>Generate Key</SubmitButton>
          </form>
           {generateState.status === "error" && (
            <p className="mt-2 text-sm text-destructive">{generateState.message}</p>
          )}
        </CardContent>
      </Card>
      
      <div>
        <h3 className="text-xl font-medium mb-4">Your Existing API Keys</h3>
        {initialApiKeys.length === 0 ? (
           <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No API keys generated yet.</p>
            </CardContent>
           </Card>
        ) : (
          <ul className="space-y-4">
            {initialApiKeys.map((apiKey) => (
              <li key={apiKey.id} className="bg-card p-4 border rounded-md shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{apiKey.name}</p>
                  <p className="text-muted-foreground font-mono text-sm break-all">{apiKey.key}</p>
                  <p className="text-muted-foreground text-xs mt-1">Generated: {new Date(apiKey.created_at).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(apiKey.key)}
                  >
                    {copiedKey === apiKey.key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <form action={() => deleteAction(apiKey.id)}>
                    <SubmitButton variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </SubmitButton>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
