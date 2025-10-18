
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fetchTokenMetadata, addToken, type FetchMetadataState, type AddTokenState } from "@/lib/actions";
import { autoFetchMissingLogo } from "@/ai/flows/auto-fetch-missing-logos";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, ArrowLeft, Loader2, Sparkles, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const initialFetchState: FetchMetadataState = {
  status: "idle",
};

const initialSaveState: AddTokenState = {
    status: "idle",
}

// The component now receives networks with id (as chainId string) and name
type DropdownNetwork = {
  id: string; // This is now the chainId from the JSON file
  name:string;
};


export function AddTokenWizard({ networks }: { networks: DropdownNetwork[] }) {
  const [fetchState, fetchAction, isFetching] = useActionState(fetchTokenMetadata, initialFetchState);
  const [saveState, saveAction] = useActionState(addToken, initialSaveState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isLogoAvailable, setIsLogoAvailable] = useState(false);

  const step = fetchState.status === 'success' && fetchState.metadata ? 2 : 1;

  useEffect(() => {
    if (saveState.status === 'success') {
        toast({ title: "Success", description: saveState.message });
        handleReset();
    } else if (saveState.status === 'error') {
        toast({ variant: "destructive", title: "Error Saving Token", description: saveState.message });
    }
  }, [saveState, toast]);
  
  // New effect to handle AI logo fetching
  useEffect(() => {
    if (step === 2 && fetchState.status === 'success' && fetchState.metadata) {
      const { logoUrl, symbol, name } = fetchState.metadata;
      if (logoUrl) {
        setPreviewUrl(logoUrl);
        setIsLogoAvailable(true);
      } else if (symbol && name) {
        // If no logo URL is present, trigger the AI to find one.
        setIsAiSearching(true);
        autoFetchMissingLogo({ tokenSymbol: symbol, tokenName: name })
          .then(result => {
            if (result.logoUrl) {
              setPreviewUrl(result.logoUrl);
              toast({ title: "AI Found a Logo!", description: `Found a logo for ${symbol} using external sources.` });
              setIsLogoAvailable(true);
            } else {
              toast({ variant: "destructive", title: "No Logo Found", description: `Could not find a logo for ${symbol}. Please upload one manually.` });
              setIsLogoAvailable(false);
            }
          })
          .catch(err => {
            console.error("AI logo fetch error:", err);
            toast({ variant: "destructive", title: "AI Search Failed", description: "The AI agent could not search for a logo."});
            setIsLogoAvailable(false);
          })
          .finally(() => {
            setIsAiSearching(false);
          });
      }
    }
  }, [step, fetchState, toast]);

  const handleReset = () => {
    // A bit of a hack to reset the fetch state to initial
    const form = document.createElement('form');
    fetchAction(new FormData(form));
    
    const emptySaveForm = new FormData();
    saveAction(emptySaveForm);
    
    formRef.current?.reset();
    setPreviewUrl(null);
    setIsLogoAvailable(false);
  }


  return (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                     <CardTitle className="text-2xl">
                        Step {step}: {step === 1 ? "Find Token By Contract" : "Verify & Save Token"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 ? "Select a network and enter a contract address to find its metadata." : "Verify the metadata. If a logo isn't found in your library, the AI will try to find one."}
                    </CardDescription>
                </div>
                {step === 2 && <Button variant="ghost" onClick={handleReset}><ArrowLeft className="mr-2 h-4 w-4"/>Start Over</Button>}
             </div>
        </CardHeader>
        <CardContent>
            {step === 1 ? (
                <form action={fetchAction} className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                           {/* The name is now `chainId` to match the backend expectation */}
                           <Label htmlFor="chainId">Network</Label>
                           <Select name="chainId" required>
                                <SelectTrigger id="chainId">
                                    <SelectValue placeholder="Select a network..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {networks.map((network) => (
                                    <SelectItem key={network.id} value={network.id}>
                                        {network.name}
                                    </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="contractAddress">Token Contract Address</Label>
                           <Input id="contractAddress" name="contractAddress" placeholder="0x..." required />
                        </div>
                     </div>
                    <SubmitButton className="w-full" disabled={isFetching}>
                        {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Search className="mr-2 h-4 w-4" />
                        Find Token
                    </SubmitButton>

                    {fetchState.status === "error" && (
                        <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Fetch Error</AlertTitle>
                        <AlertDescription>{fetchState.message}</AlertDescription>
                        </Alert>
                    )}
                </form>
            ) : (
                <form ref={formRef} action={saveAction} className="space-y-6">
                    <input type="hidden" name="contract" value={fetchState.contractAddress} />
                    {/* We now pass chainId to the save action */}
                    <input type="hidden" name="chainId" value={fetchState.chainId} />
                    
                    {fetchState.status === "success" && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Metadata Found!</AlertTitle>
                            <AlertDescription>Found on: <strong>{fetchState.metadata?.source}</strong>. Verify the details below.</AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Token Name</Label>
                            <Input id="name" name="name" defaultValue={fetchState.metadata?.name} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol</Label>
                            <Input id="symbol" name="symbol" defaultValue={fetchState.metadata?.symbol} required />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="decimals">Decimals</Label>
                        <Input id="decimals" name="decimals" type="number" defaultValue={fetchState.metadata?.decimals} required />
                    </div>

                    <div className="flex gap-6 items-center">
                        <div className="space-y-2 flex-1">
                            <Label>Matched Logo</Label>
                             <p className="text-sm text-muted-foreground">
                                This logo was found in your global library or by the AI agent. It will be automatically linked when you save.
                             </p>
                        </div>
                        <div className="flex-shrink-0 text-center">
                            <Label>{isAiSearching ? "AI Searching..." : "Logo Preview"}</Label>
                            {isAiSearching ? (
                                <div className="w-16 h-16 rounded-full mt-2 bg-muted flex items-center justify-center">
                                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                                </div>
                            ) : previewUrl ? (
                                <Image src={previewUrl} alt="Logo preview" width={64} height={64} className="rounded-full mt-2 bg-muted" unoptimized />
                            ) : (
                                <div className="w-16 h-16 rounded-full mt-2 bg-muted flex items-center justify-center text-xs text-muted-foreground">
                                    Missing
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <SubmitButton className="w-full" disabled={!isLogoAvailable || isAiSearching}>
                        { isAiSearching ? "AI is working..." : !isLogoAvailable ? "Cannot Save Without Logo" : "Save Token" }
                    </SubmitButton>

                     {saveState.status === "error" && (
                        <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Save Error</AlertTitle>
                        <AlertDescription>{saveState.message}</AlertDescription>
                        </Alert>
                    )}
                </form>
            )}
        </CardContent>
    </Card>
  )
}
