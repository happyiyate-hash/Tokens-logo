"use client";

import { useState, useTransition } from "react";
import { generateNewApiKey, deleteApiKey } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Copy, Check, Trash2, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import type { ApiKey } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

type ApiKeyManagerProps = {
  initialApiKeys: ApiKey[];
};

export function ApiKeyManager({ initialApiKeys: initialKeys }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyName, setNewKeyName] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGenerating, startGenerateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    startGenerateTransition(async () => {
      const formData = new FormData();
      formData.append("name", newKeyName);
      const result = await generateNewApiKey(undefined as any, formData);
      if (result.status === "error") {
        toast({ variant: "destructive", title: "Error", description: result.message });
      } else {
        toast({ title: "Success", description: result.message });
        setNewKeyName("");
        // Manually refetch or update state since server actions don't auto-update client state
        // For simplicity, we'll just show a success message and let revalidatePath handle it on next navigation
      }
    });
  };
  
  const handleDeleteKey = async (keyId: string) => {
    startDeleteTransition(async () => {
      const result = await deleteApiKey(keyId);
      if (result.status === "error") {
        toast({ variant: "destructive", title: "Error", description: result.message });
      } else {
        toast({ title: "Success", description: result.message });
        setApiKeys(currentKeys => currentKeys.filter(key => key.id !== keyId));
      }
    });
  };

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
          <form onSubmit={handleGenerateKey} className="flex items-end gap-4">
            <div className="flex-grow">
              <Label htmlFor="newKeyName">Key Name / Description</Label>
              <Input
                id="newKeyName"
                name="name"
                placeholder="e.g., My Crypto Wallet"
                required
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isGenerating}>
              {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Key
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div>
        <h3 className="text-xl font-medium mb-4">Your Existing API Keys</h3>
        {apiKeys.length === 0 ? (
           <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No API keys generated yet.</p>
            </CardContent>
           </Card>
        ) : (
          <ul className="space-y-4">
            {apiKeys.map((apiKey) => (
              <li key={apiKey.id} className="bg-white p-4 border rounded-md shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{apiKey.name}</p>
                  <p className="text-gray-700 font-mono text-sm break-all">{apiKey.key}</p>
                  <p className="text-gray-500 text-xs mt-1">Generated: {new Date(apiKey.created_at).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2">
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(apiKey.key)}
                    title="Copy Key"
                  >
                    {copiedKey === apiKey.key ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteKey(apiKey.id)}
                    disabled={isDeleting}
                    title="Delete Key"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
