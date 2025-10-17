
"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { generateNewApiKey, deleteApiKey, getApiKeys, type GenerateApiKeyState } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import type { ApiKey } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const initialGenerateState: GenerateApiKeyState = {
  status: "idle",
};


export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);

  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);
  const [visibleKeyId, setVisibleKeyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const [generateState, generateAction] = useActionState(generateNewApiKey, initialGenerateState);

  useEffect(() => {
    async function loadKeys() {
        setLoading(true);
        const keys = await getApiKeys();
        setApiKeys(keys);
        setLoading(false);
    }
    loadKeys();
  }, []);


  useEffect(() => {
    if (generateState.status === "error") {
      toast({ variant: "destructive", title: "Error", description: generateState.message });
    } else if (generateState.status === "success") {
      toast({ title: "Success", description: generateState.message });
      if (generateState.newKey) {
        setNewlyGeneratedKey(generateState.newKey);
        // Since we get the raw key back from the RPC, we need to refetch to get the full DB row
        async function loadKeys() {
          const keys = await getApiKeys();
          setApiKeys(keys);
          const newKeyRecord = keys.find(k => k.api_key === generateState.newKey);
          if (newKeyRecord) {
            setVisibleKeyId(newKeyRecord.id);
          }
        }
        loadKeys();
      }
    }
  }, [generateState, toast]);

  const handleDeleteKey = async (keyId: number) => {
    if (!window.confirm("Are you sure you want to delete this API key?")) return;
    
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

  const handleCopy = (key: string, keyId: number) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };
  
  const toggleVisibility = (keyId: number) => {
    setVisibleKeyId(currentId => currentId === keyId ? null : keyId);
  }

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
            <Button type="submit" disabled={generateState.status === "executing"}>
              {generateState.status === "executing" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Key
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <div>
        <h3 className="text-xl font-medium mb-4">Your Existing API Keys</h3>
        {loading ? (
             <Card>
                <CardContent className="pt-6">
                    <p className="text-muted-foreground">Loading keys...</p>
                </CardContent>
             </Card>
        ) : apiKeys.length === 0 ? (
           <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">No API keys generated yet.</p>
            </CardContent>
           </Card>
        ) : (
          <ul className="space-y-4">
            {apiKeys.map((apiKey) => {
              const isVisible = visibleKeyId === apiKey.id;
              const displayKey = isVisible ? apiKey.api_key : `${apiKey.api_key.substring(0, 7)}...${apiKey.api_key.slice(-4)}`;
              const isNewlyGenerated = newlyGeneratedKey === apiKey.api_key;

              return (
                <li key={apiKey.id} className={`bg-card p-4 border rounded-lg shadow-sm flex items-center justify-between transition-all ${isNewlyGenerated ? 'ring-2 ring-green-500' : ''}`}>
                  <div className="flex-1 overflow-hidden">
                    <p className="font-semibold text-lg">{apiKey.client_name}</p>
                    <p className="text-muted-foreground font-mono text-sm break-all pr-4">{displayKey}</p>
                    <p className="text-muted-foreground text-xs mt-1">Generated: {new Date(apiKey.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex space-x-1">
                   <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleVisibility(apiKey.id)}
                      title={isVisible ? "Hide Key" : "Show Key"}
                    >
                      {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                   <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCopy(apiKey.api_key, apiKey.id)}
                    title="Copy Key"
                  >
                    {copiedKeyId === apiKey.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteKey(apiKey.id)}
                    disabled={isDeleting}
                    title="Delete Key"
                    className="text-destructive hover:text-destructive/80"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
            )})}
          </ul>
        )}
      </div>
    </div>
  );
}
