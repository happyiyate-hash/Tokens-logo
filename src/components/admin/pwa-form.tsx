"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postPwaApp, type PostPwaAppState } from "@/lib/actions";

import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { UploadCloud } from "lucide-react";
import Image from "next/image";

const initialState: PostPwaAppState = { status: "idle" };

export function PwaForm() {
    const [state, formAction] = useActionState(postPwaApp, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    useEffect(() => {
        if (state.status === 'success') {
            toast({ title: "Success", description: state.message });
            formRef.current?.reset();
            setPreviewUrl(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = "";
            }
        } else if (state.status === 'error') {
            toast({ variant: "destructive", title: "Error Posting App", description: state.message });
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
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>Post a New PWA</CardTitle>
                <CardDescription>
                    Provide the app's external URL and its metadata. This will be listed on the "View Apps" page for users to install.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-6" encType="multipart/form-data">
                    <div className="space-y-2">
                        <Label htmlFor="name">App Name</Label>
                        <Input id="name" name="name" placeholder="e.g., WNC Wallet & Escrow" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="app_url">App URL</Label>
                        <Input id="app_url" name="app_url" type="url" placeholder="https://example-pwa.com" required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">App Description</Label>
                        <Textarea id="description" name="description" placeholder="A short description of what this app does." />
                    </div>
                    <div className="space-y-2">
                      <Label>App Icon</Label>
                       <p className="text-sm text-muted-foreground">
                        Upload a high-resolution icon (e.g., 512x512 PNG).
                      </p>
                       <div 
                          className="relative group w-32 h-32 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary transition-all"
                          onClick={handleLogoClick}
                          title="Click to upload an icon"
                        >
                        <input 
                            id="icon" 
                            name="icon" 
                            type="file" 
                            ref={fileInputRef} 
                            accept="image/png, image/jpeg, image/webp" 
                            required
                            className="hidden"
                            onChange={handleFileChange}
                          />
                        {previewUrl ? (
                            <Image 
                              src={previewUrl} 
                              alt="Icon Preview" 
                              fill 
                              className="rounded-lg object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <UploadCloud className="h-8 w-8 mx-auto" />
                              <span className="text-xs">Upload Icon</span>
                            </div>
                          )}
                        </div>
                    </div>
                   
                    <SubmitButton className="w-full">Post App</SubmitButton>
                </form>
            </CardContent>
        </Card>
    )
}
