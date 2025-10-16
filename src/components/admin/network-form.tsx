
"use client";

import { useEffect, useRef, useActionState } from "react";
import { addNetwork, type AddNetworkState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";

const initialState: AddNetworkState = {
  status: "idle",
};

export function NetworkForm() {
  const [state, formAction] = useActionState(addNetwork, initialState);
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
    <Card>
        <CardHeader>
            <CardTitle>Add New Network</CardTitle>
            <CardDescription>
                Configure a new blockchain network to manage its tokens.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <form ref={formRef} action={formAction} className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Network Name</Label>
                        <Input id="name" name="name" placeholder="e.g., Ethereum Mainnet" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="chain_id">Chain ID</Label>
                        <Input id="chain_id" name="chain_id" type="number" placeholder="e.g., 1" required />
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="explorer_api_base_url">Explorer API Base URL</Label>
                    <Input id="explorer_api_base_url" name="explorer_api_base_url" placeholder="https://api.etherscan.io/api" required />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="explorer_api_key_env_var">API Key Environment Variable Name</Label>
                    <Input id="explorer_api_key_env_var" name="explorer_api_key_env_var" placeholder="ETHERSCAN_API_KEY" required />
                     <p className="text-xs text-muted-foreground">The name of the variable in your .env file holding the API key for this network's explorer.</p>
                </div>
                <SubmitButton>Add Network</SubmitButton>
            </form>
        </CardContent>
    </Card>
  );
}
