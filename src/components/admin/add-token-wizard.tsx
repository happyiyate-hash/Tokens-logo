
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
import { Terminal, CheckCircle, Loader2, Sparkles, Search, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const initialFetchState: FetchMetadataState = { status: "idle" };
const initialSaveState: AddTokenState = { status: "idle" };

type DropdownNetwork = {
  id: string; // This is the chainId from the JSON file
  name:string;
};

// Form data state
interface TokenFormData {
    name: string;
    symbol: string;
    decimals: string;
    contractAddress: string;
    chainId: string;
}

const initialFormData: TokenFormData = {
    name: "",
    symbol: "",
    decimals: "",
    contractAddress: "",
    chainId: "",
};

export function AddTokenWizard({ networks }: { networks: DropdownNetwork[] }) {
  const [fetchState, fetchAction, isFetching] = useActionState(fetchTokenMetadata, initialFetchState);
  const [saveState, saveAction, isSaving] = useActionState(addToken, initialSaveState);
  
  const { toast } = useToast();
  const fetchFormRef = useRef<HTMLFormElement>(null);
  const saveFormRef = useRef<HTMLFormElement>(null);

  const [formData, setFormData] = useState<TokenFormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [isLogoAvailable, setIsLogoAvailable] = useState(false);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };
  const handleSelectChange = (value: string) => {
    setFormData(prev => ({...prev, chainId: value}));
  };

  // Effect to display toast on save action result
  useEffect(() => {
    if (saveState.status === 'success') {
        toast({ title: "Success", description: saveState.message });
        handleReset();
    } else if (saveState.status === 'error') {
        toast({ variant: "destructive", title: "Error Saving Token", description: saveState.message });
    }
  }, [saveState, toast]);

  // Effect to process the result of the fetch action
  useEffect(() => {
    if (fetchState.status === 'success' && fetchState.metadata) {
        toast({ title: "Metadata Found!", description: `Found on: ${fetchState.metadata.source}. You can now save or edit.`});
        setFormData(prev => ({
            ...prev,
            name: fetchState.metadata?.name || "",
            symbol: fetchState.metadata?.symbol || "",
            decimals: fetchState.metadata?.decimals?.toString() || "18",
        }));
        // Trigger logo search after metadata is populated
        handleLogoSearch(fetchState.metadata.name, fetchState.metadata.symbol, fetchState.metadata.logoUrl);
    } else if (fetchState.status === 'error') {
        toast({ variant: "destructive", title: "Fetch Error", description: fetchState.message });
        // Keep the form fields editable for manual entry
    }
  }, [fetchState, toast]);

  const handleLogoSearch = (name: string, symbol: string, existingLogoUrl?: string | null) => {
      if (!name || !symbol) return;

      if (existingLogoUrl) {
          setPreviewUrl(existingLogoUrl);
          setIsLogoAvailable(true);
          return;
      }
      
      setIsAiSearching(true);
      autoFetchMissingLogo({ tokenSymbol: symbol, tokenName: name })
        .then(result => {
          if (result.logoUrl) {
            setPreviewUrl(result.logoUrl);
            toast({ title: "AI Found a Logo!", description: `Found a logo for ${symbol}.` });
            setIsLogoAvailable(true);
          } else {
            toast({ variant: "destructive", title: "No Logo Found", description: `Could not find a logo for ${symbol}. You can upload one from the "Manage Logos" page.` });
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
  };

  const handleReset = () => {
    setFormData(initialFormData);
    const form = document.createElement('form');
    fetchAction(new FormData(form)); // Reset fetch state
    const emptySaveForm = new FormData();
    saveAction(emptySaveForm); // Reset save state
    fetchFormRef.current?.reset();
    saveFormRef.current?.reset();
    setPreviewUrl(null);
    setIsLogoAvailable(false);
  };
  
  const canSave = formData.name && formData.symbol && formData.chainId && formData.contractAddress && isLogoAvailable && !isAiSearching;

  return (
    <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
            <CardTitle className="text-2xl">Find or Add Token</CardTitle>
            <CardDescription>
                First, try to find a token by its contract address. If that fails, or if you need to make corrections, you can enter the details manually below before saving.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            {/* --- FINDER FORM --- */}
            <form ref={fetchFormRef} action={fetchAction} className="space-y-4 p-4 border rounded-lg bg-background/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="find_chainId">Network</Label>
                        <Select name="chainId" onValueChange={handleSelectChange} required>
                            <SelectTrigger id="find_chainId">
                                <SelectValue placeholder="Select network" />
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
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="find_contractAddress">Token Contract Address</Label>
                        <Input id="find_contractAddress" name="contractAddress" placeholder="0x..." onChange={handleInputChange} required />
                    </div>
                </div>
                <SubmitButton className="w-full" disabled={isFetching || !formData.chainId || !formData.contractAddress}>
                    {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Search className="mr-2 h-4 w-4" />
                    Find Token by Contract
                </SubmitButton>
            </form>

            <div className="border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Token Details (Verify or Enter Manually)</h3>
                {/* --- SAVER FORM --- */}
                <form ref={saveFormRef} action={saveAction} className="space-y-6">
                    {/* Hidden fields to pass all required data to the save action */}
                    <input type="hidden" name="contract" value={formData.contractAddress} />
                    <input type="hidden" name="chainId" value={formData.chainId} />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Token Name</Label>
                            <Input id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="e.g., Tether USD" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="symbol">Symbol</Label>
                            <Input id="symbol" name="symbol" value={formData.symbol} onChange={handleInputChange} placeholder="e.g., USDT" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="decimals">Decimals</Label>
                        <Input id="decimals" name="decimals" type="number" value={formData.decimals} onChange={handleInputChange} placeholder="e.g., 6" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="contractAddress_display">Contract Address</Label>
                        <Input id="contractAddress_display" value={formData.contractAddress} readOnly disabled className="font-mono bg-muted/50" />
                    </div>

                    <div className="flex gap-6 items-center pt-4">
                        <div className="space-y-2 flex-1">
                            <Label>Matched Logo</Label>
                            <p className="text-sm text-muted-foreground">
                                This logo was found in your global library or by the AI agent. A logo is required to save the token.
                            </p>
                        </div>
                        <div className="flex-shrink-0 text-center">
                            <Label>{isAiSearching ? "AI Searching..." : "Logo Preview"}</Label>
                            <div className="w-20 h-20 relative mt-2">
                            {isAiSearching ? (
                                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                                </div>
                            ) : previewUrl ? (
                                <Image src={previewUrl} alt="Logo preview" fill className="rounded-full bg-muted object-cover" unoptimized />
                            ) : (
                                <div className="w-full h-full rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                                    No Logo
                                </div>
                            )}
                            </div>
                        </div>
                    </div>

                    <SubmitButton className="w-full" disabled={!canSave || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isAiSearching ? "AI is working..." : !isLogoAvailable ? "Cannot Save Without Logo" : <><Save className="mr-2 h-4 w-4" /> Save Token </> }
                    </SubmitButton>

                    {saveState.status === "error" && (
                        <Alert variant="destructive" className="mt-4">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Save Error</AlertTitle>
                        <AlertDescription>{saveState.message}</AlertDescription>
                        </Alert>
                    )}
                </form>
            </div>
        </CardContent>
    </Card>
  )
}
