
"use client";

import { useActionState } from "react";
import { searchToken, type SearchState } from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { TokenCard } from "@/components/token-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const initialState: SearchState = {
  status: "idle",
};

export function TokenSearch() {
  const [state, formAction] = useActionState(searchToken, initialState);

  return (
    <div className="w-full max-w-md space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Search Token</CardTitle>
          <CardDescription>
            Enter a token symbol to fetch its metadata and logo. The first match will be returned.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tokenSymbol">Token Symbol</Label>
              <Input
                id="tokenSymbol"
                name="tokenSymbol"
                placeholder="e.g., USDT"
                className="font-code"
                required
              />
            </div>
            <SubmitButton className="w-full">Search</SubmitButton>
          </form>
        </CardContent>
      </Card>

      {state.status === "error" && (
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "success" && state.token && (
        <TokenCard token={state.token} />
      )}
    </div>
  );
}
