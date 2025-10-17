
"use client";

import { useEffect, useRef, useActionState, useState } from "react";
import { addToken, type AddTokenState } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { UploadCloud } from "lucide-react";
import Image from "next/image";

const initialState: AddTokenState = {
  status: "idle",
};

export function UploadForm({ networkId }: { networkId: string }) {
  const [state, formAction] = useActionState(addToken, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Success",
        description: state.message,
      });
      formRef.current?.reset();
      setPreviewUrl(null);
    } else if (state.status === "error") {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.message,
      });
    }
  }, [state, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-lg border-0 shadow-none">
      <CardHeader className="p-0 pb-6 text-center">
        <CardTitle>Add or Update Token</CardTitle>
        <CardDescription>
          Upload a logo and provide token details. The logo will be linked to the symbol globally.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form ref={formRef} action={formAction} className="grid gap-6">
          <input type="hidden" name="networkId" value={networkId} />
          
          <div className="flex justify-center">
             <input 
                id="logo" 
                name="logo" 
                type="file" 
                ref={fileInputRef} 
                accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                required
                className="hidden"
                onChange={handleFileChange}
              />
            <div 
              className="relative group w-32 h-32 bg-muted rounded-full flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary transition-all"
              onClick={handleLogoClick}
              title="Click to upload a logo"
            >
              {previewUrl ? (
                <Image 
                  src={previewUrl} 
                  alt="Logo Preview" 
                  fill 
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="text-center text-muted-foreground">
                  <UploadCloud className="h-8 w-8 mx-auto" />
                  <span className="text-xs">Upload Logo</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Token Name</Label>
              <Input id="name" name="name" placeholder="e.g., Tether" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol</Label>
              <Input id="symbol" name="symbol" placeholder="e.g., USDT" required />
            </div>
          </div>
          <div className="space-y-2">
              <Label htmlFor="contract">Contract Address (Optional)</Label>
              <Input id="contract" name="contract" placeholder="0x... (leave blank for a global symbol logo)" />
               <p className="text-xs text-muted-foreground">Link this logo to a specific contract on the selected network.</p>
          </div>
          
          <SubmitButton>Add / Update Token</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
