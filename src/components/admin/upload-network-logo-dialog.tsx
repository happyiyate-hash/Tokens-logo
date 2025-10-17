
"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateNetworkLogo } from "@/lib/actions";
import type { Network } from "@/lib/types";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UploadCloud, Pencil, Upload } from "lucide-react";
import { Loader2 } from "lucide-react";

interface UploadNetworkLogoDialogProps {
  network: Network;
}

export function UploadNetworkLogoDialog({ network }: UploadNetworkLogoDialogProps) {
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(network.logo_url || null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset form state when dialog is closed
  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      setPreviewUrl(network.logo_url || null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open, network.logo_url]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(network.logo_url || null);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (formData: FormData) => {
    startTransition(async () => {
        const result = await updateNetworkLogo(undefined, formData);
        if (result.status === "success") {
            toast({
                title: "Success",
                description: result.message,
            });
            setOpen(false);
        } else {
            toast({
                variant: "destructive",
                title: "Update Failed",
                description: result.message ?? "An unknown error occurred.",
            });
        }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Upload or change logo">
            <Upload className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Update Logo for {network.name}</DialogTitle>
          <DialogDescription>
            Upload a new image for this network. This logo will be displayed in connected wallet apps.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={handleSubmit} className="grid gap-6 py-4">
            <input type="hidden" name="networkId" value={network.id} />

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
                  title="Click to upload a new logo"
                >
                  {previewUrl ? (
                    <Image 
                      src={previewUrl} 
                      alt="Logo Preview" 
                      fill 
                      className="rounded-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <UploadCloud className="h-8 w-8 mx-auto" />
                      <span className="text-xs">Upload Logo</span>
                    </div>
                  )}
                   <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                        <Pencil className="h-6 w-6" />
                    </div>
                </div>
            </div>
            
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending || !previewUrl}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Logo
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
