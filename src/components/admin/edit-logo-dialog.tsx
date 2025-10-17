
"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react-dom";
import { updateGlobalLogo, type UpdateGlobalLogoState } from "@/lib/actions";
import type { TokenLogo } from "@/lib/types";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/submit-button";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";

const initialState: UpdateGlobalLogoState = {
  status: "idle",
};

interface EditLogoDialogProps {
  logo: TokenLogo;
  children: React.ReactNode;
}

export function EditLogoDialog({ logo, children }: EditLogoDialogProps) {
  const [state, formAction] = useActionState(updateGlobalLogo, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(logo.public_url);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.status === "success") {
      toast({
        title: "Success",
        description: state.message,
      });
      setOpen(false); // Close dialog on success
    } else if (state.status === "error") {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: state.message,
      });
    }
  }, [state, toast]);
  
  // Reset form state when dialog is closed
  useEffect(() => {
    if (!open) {
      formRef.current?.reset();
      setPreviewUrl(logo.public_url);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open, logo.public_url]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(logo.public_url);
    }
  };

  const handleLogoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Global Logo: {logo.symbol}</DialogTitle>
          <DialogDescription>
            Update the name or upload a new image for this symbol. This change will affect all instances where this global logo is used.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-6 py-4">
            <input type="hidden" name="logoId" value={logo.id} />
            <input type="hidden" name="symbol" value={logo.symbol} />

            <div className="flex justify-center">
                 <input 
                    id="logo" 
                    name="logo" 
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/png, image/jpeg, image/svg+xml, image/webp" 
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

            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="symbol_display" className="text-right">Symbol</Label>
                <Input id="symbol_display" value={logo.symbol} readOnly className="col-span-3 bg-muted/50" />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Name</Label>
                <Input id="name" name="name" defaultValue={logo.name || ""} className="col-span-3" placeholder="e.g., Wrapped Ether" />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <SubmitButton>Save Changes</SubmitButton>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

    