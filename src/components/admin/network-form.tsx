
"use client";

import { useEffect, useRef, useActionState, useState } from "react";
import { addNetwork, type AddNetworkState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import chains from "@/lib/chains.json";

const initialState: AddNetworkState = {
  status: "idle",
};

export function NetworkForm() {
  const [state, formAction] = useActionState(addNetwork, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedChain, setSelectedChain] = useState<any>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Success",
        description: state.message,
      });
      formRef.current?.reset();
      setSelectedChain(null);
    } else if (state.status === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleChainSelect = (chainId: string) => {
    const chain = chains.find(c => c.chainId.toString() === chainId);
    setSelectedChain(chain);
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Add New Network</CardTitle>
            <CardDescription>
                Select a pre-configured network or add one manually. You will still need to provide the block explorer API information.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <form ref={formRef} action={formAction} className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="chain">Select Pre-configured Network</Label>
                   <Select onValueChange={handleChainSelect}>
                    <SelectTrigger id="chain">
                      <SelectValue placeholder="Select a network..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chains.map((chain) => (
                        <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                          {chain.name} (ID: {chain.chainId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <input type="hidden" name="name" value={selectedChain?.name || ''} />
                <input type="hidden" name="chain_id" value={selectedChain?.chainId || ''} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="name_display">Network Name</Label>
                        <Input id="name_display" placeholder="e.g., Ethereum Mainnet" required value={selectedChain?.name || ''} readOnly />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="chain_id_display">Chain ID</Label>
                        <Input id="chain_id_display" type="number" placeholder="e.g., 1" required value={selectedChain?.chainId || ''} readOnly />
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
                <SubmitButton disabled={!selectedChain}>Add Network</SubmitButton>
            </form>
        </CardContent>
    </Card>
  );
}
