"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import { generateNewApiKey } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";
import { Copy, Check } from "lucide-react";
import { Button } from "../ui/button";

type ApiKeyManagerProps = {
  initialApiKey: string | null;
};

export function ApiKeyManager({ initialApiKey }: ApiKeyManagerProps) {
  const [state, formAction] = useFormState(generateNewApiKey, {
    status: "idle",
    apiKey: initialApiKey,
  });

  const [copied, setCopied] = useState(false);

  const apiKey = state.status === "success" ? state.apiKey : initialApiKey;

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Key</CardTitle>
        <CardDescription>
          This key is required to access the token logo API. Keep it secure.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Label htmlFor="api-key">Your API Key</Label>
          <Input
            id="api-key"
            type="text"
            readOnly
            value={apiKey ?? "No key generated yet."}
            className="pr-10 font-code"
          />
          {apiKey && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-6 h-8 w-8"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        <form action={formAction}>
          <SubmitButton>
            {apiKey ? "Regenerate API Key" : "Generate API Key"}
          </SubmitButton>
        </form>
         {state.status === "error" && (
            <p className="text-sm text-destructive">{state.message}</p>
        )}
      </CardContent>
    </Card>
  );
}
