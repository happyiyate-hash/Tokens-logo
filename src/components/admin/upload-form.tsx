"use client";

import { useEffect, useRef, useActionState } from "react";
import { addToken, type AddTokenState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

const initialState: AddTokenState = {
  status: "idle",
};

export function UploadForm({ networkId }: { networkId: string }) {
  const [state, formAction] = useActionState(addToken, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Success",
        description: state.message,
      });
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Card className="w-full max-w-lg border-0 shadow-none">
      <CardHeader className="p-0 pb-6">
        <CardTitle>Add or Update Token</CardTitle>
        <CardDescription>
          Provide the token's metadata. If a token with the same contract address already exists, it will be updated.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form ref={formRef} action={formAction} className="grid gap-6">
          <input type="hidden" name="networkId" value={networkId} />
          <div className="space-y-2">
              <Label htmlFor="contract">Contract Address</Label>
              <Input id="contract" name="contract" placeholder="0x..." required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name</Label>
              <Input id="name" name="name" placeholder="Tether" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input id="symbol" name="symbol" placeholder="USDT" required />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
             <div className="space-y-2">
              <Label htmlFor="decimals">Decimals</Label>
              <Input id="decimals" name="decimals" type="number" placeholder="6" required />
            </div>
             <div className="space-y-2">
              <Label htmlFor="logo">Logo Image</Label>
              <Input id="logo" name="logo" type="file" required accept="image/png, image/jpeg, image/svg+xml" />
            </div>
          </div>
          
          <SubmitButton>Add / Update Token</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
