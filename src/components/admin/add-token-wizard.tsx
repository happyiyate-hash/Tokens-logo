
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
import { Terminal, CheckCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const initialFetchState: FetchMetadataState = {
  status: "idle",
};

const initialSaveState: AddTokenState = {
    status: "idle",
}

// A simplified type for the dropdown networks
type DropdownNetwork = {
  id: string; // Corresponds to chainId
  name: string;
};


export function AddTokenWizard({ networks }: { networks: DropdownNetwork[] }) {
  const [fetchState, fetchAction, isFetching] = useActionState(fetchTokenMetadata, initialFetchState);
  const [saveState, saveAction] = useActionState(addToken, initialSaveState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFetchingLogo, setIsFetchingLogo] = useState(false);

  const step = fetchState.status === 'success' && fetchState.metadata ? 2 : 1;

  useEffect(() => {
    if (saveState.status === 'success') {
        toast({ title: "Success", description: saveState.message });
        handleReset();
    } else if (saveState.status === 'error') {
        toast({ variant: "destructive", title: "Error Saving Token", description: saveState.message });
    }
  }, [saveState, toast]);
  
  // Set preview URL from fetched data, including from our global logo table
  useEffect(() => {
    if (fetchState.status === 'success' && fetchState.metadata?.logoUrl) {
      setPreviewUrl(fetchState.metadata.logoUrl);
    }
  }, [fetchState]);

  // AI-powered logo fetch
  const handleAutoFetchLogo = async () => {
    if (!fetchState.metadata?.symbol || !fetchState.metadata?.name) return;
    
    setIsFetchingLogo(true);
    try {
        const result = await autoFetchMissingLogo({ 
            tokenSymbol: fetchState.metadata.symbol,
            tokenName: fetchState.metadata.name,
        });
        if (result.logoUrl) {
            setPreviewUrl(result.logoUrl);
            toast({ title: "AI Found a Logo!", description: `A logo for ${fetchState.metadata.symbol} was found and pre-filled.` });
        } else {
            toast({ variant: "destructive", title: "AI Fetch Failed", description: `Could not automatically find a logo for ${fetchState.metadata.symbol}.` });
        }
    } catch (error) {
        console.error("AI logo fetch error:", error);
        toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred while fetching the logo." });
    } finally {
        setIsFetchingLogo(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If user deselects file, revert to the fetched logo if available
      setPreviewUrl(fetchState.metadata?.logoUrl || null);
    }
  };

  const handleReset = () => {
    // A bit of a hack to reset the fetch state to initial
    const form = document.createElement('form');
    fetchAction(new FormData(form));
    
    const emptySaveForm = new FormData();
    saveAction(emptySaveForm);
    
    formRef.current?.reset();
    setPreviewUrl(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  }


  return (
    <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
             <div className="flex items-center justify-between">
                <div>
                     <CardTitle className="text-2xl">
                        Step {step}: {step === 1 ? "Fetch Token Metadata" : "Save Token Information"}
                    </CardTitle>
                    <CardDescription>
                        {step === 1 ? "Enter a contract address to look up its details." : "Verify the metadata and upload a logo."}
                    </CardDescription>
                </div>
                {step === 2 && <Button variant="ghost" onClick={handleReset}><ArrowLeft className="mr-2 h-4 w-4"/>Start Over</Button>}
             </div>
        </CardHeader>
        <CardContent>
            {step === 1 ? (
                <form action={fetchAction} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="chainId">Blockchain Network</Label>
                        <Select name="chainId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a network" />
                            </SelectTrigger>
                            <SelectContent>
                                {networks.map(network => (
                                    <SelectItem key={network.id} value={network.id}>{network.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="contractAddress">Token Contract Address</Label>
                        <Input id="contractAddress" name="contractAddress" placeholder="0x..." required />
                    </div>
                    <SubmitButton className="w-full" disabled={isFetching}>
                        {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Fetch Metadata
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
                    <input type="hidden" name="chainId" value={fetchState.chainId} />
                    {previewUrl && <input type="hidden" name="logo_url" value={previewUrl} />}

                    {fetchState.status === "success" && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Metadata Found!</AlertTitle>
                            <AlertDescription>Verify the details below. A logo was pre-filled from our global library or by AI. You can override it by uploading a new one.</AlertDescription>
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
                            <Label htmlFor="logo">Logo Image</Label>
                            <div className="flex gap-2">
                                <Input id="logo" name="logo" type="file" ref={fileInputRef} accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif" onChange={handleFileChange} />
                                <Button type="button" variant="outline" onClick={handleAutoFetchLogo} disabled={isFetchingLogo}>
                                    {isFetchingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                    AI Fetch
                                </Button>
                            </div>
                             <p className="text-xs text-muted-foreground">Upload a logo or use AI to find one. Found logos are pre-filled.</p>
                        </div>
                        {previewUrl && (
                            <div className="flex-shrink-0">
                                <Label>Preview</Label>
                                <Image src={previewUrl} alt="Logo preview" width={64} height={64} className="rounded-full mt-2 bg-muted" unoptimized />
                            </div>
                        )}
                    </div>
                    
                    <SubmitButton className="w-full">Save Token</SubmitButton>

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

    