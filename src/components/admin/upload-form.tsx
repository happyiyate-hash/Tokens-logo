"use client";

import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { addToken, type AddTokenState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

const initialState: AddTokenState = {
  status: "idle",
};

export function UploadForm() {
  const [state, formAction] = useFormState(addToken, initialState);
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
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Add New Token</CardTitle>
        <CardDescription>
          Upload a logo and provide the token's metadata.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="grid gap-6">
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
          <div className="space-y-2">
            <Label htmlFor="contract">Contract Address</Label>
            <Input id="contract" name="contract" placeholder="0x..." className="font-code" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chain">Chain</Label>
              <Input id="chain" name="chain" placeholder="ethereum" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decimals">Decimals</Label>
              <Input id="decimals" name="decimals" type="number" placeholder="6" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="logo">Logo Image</Label>
            <Input id="logo" name="logo" type="file" required accept="image/png, image/jpeg, image/svg+xml" />
          </div>
          <SubmitButton>Add Token</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
