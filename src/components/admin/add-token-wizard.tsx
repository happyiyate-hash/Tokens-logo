
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fetchTokenMetadata, addToken, type FetchMetadataState, type AddTokenState } from "@/lib/actions";
import type { Network } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const initialFetchState: FetchMetadataState = {
  status: "idle",
};

const initialSaveState: AddTokenState = {
    status: "idle",
}

export function AddTokenWizard({ networks }: { networks: Network[] }) {
  const [fetchState, fetchAction] = useActionState(fetchTokenMetadata, initialFetchState);
  const [saveState, saveAction] = useActionState(addToken, initialSaveState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const step = fetchState.status === 'success' && fetchState.metadata ? 2 : 1;

  useEffect(() => {
    if (saveState.status === 'success') {
        toast({ title: "Success", description: saveState.message });
        handleReset();
    } else if (saveState.status === 'error') {
        toast({ variant: "destructive", title: "Error Saving Token", description: saveState.message });
    }
  }, [saveState, toast]);
  
  // Set preview URL from fetched data
  useEffect(() => {
    if (fetchState.status === 'success' && fetchState.metadata?.logoUrl) {
      setPreviewUrl(fetchState.metadata.logoUrl);
    }
  }, [fetchState]);

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
    
    // Reset save state
    const saveForm = document.createElement('form');
    saveAction(new FormData(saveForm));
    
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
                        <Label htmlFor="networkId">Blockchain Network</Label>
                        <Select name="networkId" required>
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
                    <SubmitButton className="w-full">Fetch Metadata</SubmitButton>

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
                    <input type="hidden" name="networkId" value={fetchState.networkId} />
                    {fetchState.metadata?.logoUrl && <input type="hidden" name="logo_url" value={fetchState.metadata.logoUrl} />}

                    {fetchState.status === "success" && (
                        <Alert>
                            <CheckCircle className="h-4 w-4" />
                            <AlertTitle>Metadata Found!</AlertTitle>
                            <AlertDescription>Verify the details below before saving. You can override the fetched logo by uploading a new one.</AlertDescription>
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
                            <Label htmlFor="logo">Logo Image (Optional)</Label>
                            <Input id="logo" name="logo" type="file" ref={fileInputRef} accept="image/png, image/jpeg, image/svg+xml" onChange={handleFileChange} />
                             <p className="text-xs text-muted-foreground">You can override the logo found by uploading a new image.</p>
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
