
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { fetchTokenMetadata, addToken, type FetchMetadataState, type AddTokenState } from "@/lib/actions";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CheckCircle, Loader2, Sparkles, Search, Save, UploadCloud, BadgeCheck, BadgeAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const initialFetchState: FetchMetadataState = { status: "idle" };
const initialSaveState: AddTokenState = { status: "idle" };

type DropdownNetwork = {
  id: string;
  name:string;
};

interface TokenFormData {
    name: string;
    symbol: string;
    decimals: string;
    contractAddress: string;
    chainId: string;
    priceSource: string;
    priceId: string;
    totalSupply: string;
    networkName: string;
    price: number;
    verified: boolean;
}

const initialFormData: TokenFormData = {
    name: "",
    symbol: "",
    decimals: "",
    contractAddress: "",
    chainId: "",
    priceSource: "",
    priceId: "",
    totalSupply: "",
    networkName: "",
    price: 0,
    verified: false,
};

export function AddTokenWizard({ networks }: { networks: DropdownNetwork[] }) {
  const [fetchState, fetchAction, isFetching] = useActionState(fetchTokenMetadata, initialFetchState);
  const [saveState, saveAction, isSaving] = useActionState(addToken, initialSaveState);
  
  const { toast } = useToast();
  const fetchFormRef = useRef<HTMLFormElement>(null);
  const saveFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<TokenFormData>(initialFormData);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLogoAvailable, setIsLogoAvailable] = useState(false);
  const [manualLogoFile, setManualLogoFile] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  };
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
    if (value.length === 42) {
      const newFormData = new FormData();
      newFormData.append('contractAddress', value);
      fetchAction(newFormData);
    }
  }

  const handleSelectChange = (value: string) => {
    const selectedNetwork = networks.find(n => n.id === value);
    setFormData(prev => ({
        ...prev, 
        chainId: value,
        networkName: selectedNetwork?.name || "",
    }));
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setManualLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
        setIsLogoAvailable(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAction = (formDataWithNativeFields: FormData) => {
      if (manualLogoFile) {
        formDataWithNativeFields.append('logo', manualLogoFile);
      }
      saveAction(formDataWithNativeFields);
  };

  useEffect(() => {
    if (saveState.status === 'success') {
        toast({ title: "Success", description: saveState.message });
        handleReset();
    } else if (saveState.status === 'error') {
        toast({ variant: "destructive", title: "Error Saving Token", description: saveState.message });
    }
  }, [saveState, toast]);

  useEffect(() => {
    if (fetchState.status === 'success' && fetchState.metadata) {
        toast({ title: "Token Detected!", description: `Found on: ${fetchState.metadata.networkName}. You can now save or edit.`});
        setFormData(prev => ({
            ...prev,
            name: fetchState.metadata?.name || "",
            symbol: fetchState.metadata?.symbol || "",
            decimals: fetchState.metadata?.decimals?.toString() || "18",
            priceSource: fetchState.metadata?.priceSource || 'coingecko',
            priceId: fetchState.metadata?.priceId || '',
            totalSupply: fetchState.metadata?.totalSupply || '',
            networkName: fetchState.metadata?.networkName || '',
            chainId: fetchState.metadata?.chainId?.toString() || '',
            price: fetchState.metadata?.price || 0,
            verified: fetchState.metadata?.verified || false,
        }));
        if (fetchState.metadata.logoUrl) {
            setPreviewUrl(fetchState.metadata.logoUrl);
            setIsLogoAvailable(true);
        } else {
             toast({ variant: "default", title: "No Logo Found", description: `You can upload a logo manually.` });
             setIsLogoAvailable(false);
             setPreviewUrl(null);
        }
    } else if (fetchState.status === 'error') {
        toast({ variant: "destructive", title: "Detection Error", description: fetchState.message });
        // Reset relevant fields but keep contract address
        setFormData(prev => ({
            ...initialFormData,
            contractAddress: prev.contractAddress,
        }));
    }
  }, [fetchState, toast]);


  const handleReset = () => {
    setFormData(initialFormData);
    fetchFormRef.current?.reset();
    saveFormRef.current?.reset();
    setPreviewUrl(null);
    setIsLogoAvailable(false);
    setManualLogoFile(null);
  };
  
  const canSave = formData.name && formData.symbol && formData.chainId && formData.contractAddress && isLogoAvailable;

  return (
    <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
            <CardTitle className="text-2xl">Find or Add Token</CardTitle>
            <CardDescription>
                Paste a contract address to auto-detect token details across all supported networks. You can verify or edit the details before saving.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
            <form ref={fetchFormRef} action={fetchAction} className="space-y-4 p-4 border rounded-lg bg-background/50">
                <div className="space-y-2">
                    <Label htmlFor="find_contractAddress">Token Contract Address</Label>
                    <div className="flex gap-2">
                        <Input id="find_contractAddress" name="contractAddress" placeholder="0x... (paste here to auto-detect)" onChange={handleAddressChange} required value={formData.contractAddress} />
                        <SubmitButton disabled={isFetching || !formData.contractAddress}>
                            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Detect
                        </SubmitButton>
                    </div>
                </div>
            </form>

            { (fetchState.status !== 'idle' || formData.name) && (
            <div className="border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Token Details (Verify or Enter Manually)</h3>
                <form ref={saveFormRef} action={handleSaveAction} className="space-y-6">
                    <input type="hidden" name="contract" value={formData.contractAddress} />
                    <input type="hidden" name="chainId" value={formData.chainId} />
                    <input type="hidden" name="totalSupply" value={formData.totalSupply} />

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
                     <div className="flex items-center gap-4">
                        <div className="space-y-2 flex-1">
                            <Label htmlFor="networkName">Detected Network</Label>
                            <Input id="networkName" name="networkName" value={formData.networkName} readOnly disabled />
                        </div>
                         <div className="space-y-2">
                            <Label>Verified</Label>
                            <div>
                            {formData.verified ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <BadgeCheck className="mr-2 h-4 w-4" /> Verified
                                </Badge>
                            ) : (
                                <Badge variant="destructive">
                                    <BadgeAlert className="mr-2 h-4 w-4" /> Unverified
                                </Badge>
                            )}
                            </div>
                        </div>
                     </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="decimals">Decimals</Label>
                            <Input id="decimals" name="decimals" type="number" value={formData.decimals} onChange={handleInputChange} placeholder="e.g., 6" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="price">Price (USD)</Label>
                            <Input id="price" name="price" type="number" value={formData.price || ''} onChange={handleInputChange} placeholder="e.g., 1.00" />
                        </div>
                         <div className="space-y-2 col-span-2">
                            <Label htmlFor="priceId">CoinGecko Price ID</Label>
                            <Input id="priceId" name="priceId" value={formData.priceId} onChange={handleInputChange} placeholder="e.g., tether" />
                        </div>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="contractAddress_display">Contract Address</Label>
                        <Input id="contractAddress_display" value={formData.contractAddress} readOnly disabled className="font-mono bg-muted/50" />
                    </div>

                     <div className="flex gap-6 items-center pt-4">
                        <div className="space-y-2 flex-1">
                            <Label>Token Logo</Label>
                            <p className="text-sm text-muted-foreground">
                                A logo is required. If a logo is not found automatically, click the placeholder to upload one manually.
                            </p>
                        </div>
                        <div className="flex-shrink-0 text-center">
                            <Label>Logo Preview</Label>
                            <input
                                id="logo_manual_upload"
                                name="logo_manual_upload"
                                type="file"
                                ref={fileInputRef}
                                accept="image/png, image/jpeg, image/svg+xml, image/webp"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div 
                                className="w-20 h-20 relative mt-2 group"
                                onClick={handleLogoClick}
                            >
                                {previewUrl ? (
                                    <Image src={previewUrl} alt="Logo preview" fill className="rounded-full bg-muted object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-muted flex flex-col items-center justify-center text-xs text-muted-foreground text-center p-2 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors">
                                        <UploadCloud className="h-6 w-6 mb-1" />
                                        <span>Upload Logo</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <SubmitButton className="w-full" disabled={!canSave || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {!isLogoAvailable ? "Cannot Save Without Logo" : <><Save className="mr-2 h-4 w-4" /> Save Token </> }
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
            )}
        </CardContent>
    </Card>
  )
}
