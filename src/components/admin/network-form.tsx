
"use client";

import { useEffect, useRef, useActionState, useState } from "react";
import { addNetwork, type AddNetworkState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import chainsConfig from "@/lib/chains.json";

const initialState: AddNetworkState = {
  status: "idle",
};

export function NetworkForm() {
  const [state, formAction] = useActionState(addNetwork, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [selectedChainId, setSelectedChainId] = useState<string>("");
  
  const selectedChain = chainsConfig.chains.find(c => c.chainId.toString() === selectedChainId);

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Success",
        description: state.message,
      });
      formRef.current?.reset();
      setSelectedChainId("");
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
                Select a pre-configured network from the Etherscan-supported list. The API URL will be pre-filled. You may need to provide an API key environment variable name if the network requires one.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <form ref={formRef} action={formAction} className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="chain">Select Pre-configured Network</Label>
                   <Select onValueChange={setSelectedChainId}>
                    <SelectTrigger id="chain">
                      <SelectValue placeholder="Select a network..." />
                    </SelectTrigger>
                    <SelectContent>
                      {chainsConfig.chains.map((chain) => (
                        <SelectItem key={chain.chainId} value={chain.chainId.toString()}>
                          {chain.name} (ID: {chain.chainId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <input type="hidden" name="name" value={selectedChain?.name || ''} />
                <input type="hidden" name="chain_id" value={selectedChain?.chainId || ''} />
                <input type="hidden" name="explorer_api_base_url" value={selectedChain?.api || ''} />

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
                    <Label htmlFor="explorer_api_base_url_display">API Base URL</Label>
                    <Input 
                      id="explorer_api_base_url_display" 
                      placeholder="https://api.etherscan.io/api" 
                      required 
                      value={selectedChain?.api || ''}
                      readOnly
                    />
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="explorer_api_key_env_var">API Key Environment Variable Name</Label>
                    <Input id="explorer_api_key_env_var" name="explorer_api_key_env_var" placeholder="ETHERSCAN_API_KEY (or other variable name)" />
                     <p className="text-xs text-muted-foreground">The name of the variable in your .env file holding the API key.</p>
                </div>
                <SubmitButton disabled={!selectedChain}>Add Network</SubmitButton>
            </form>
        </CardContent>
    </Card>
  );
}
