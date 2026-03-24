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

function IconUploader({ label, name, required = false }: { label: string, name: string, required?: boolean }) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const handleBoxClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <div 
                className="relative group w-32 h-32 bg-muted rounded-lg flex items-center justify-center cursor-pointer border-2 border-dashed border-border hover:border-primary transition-all"
                onClick={handleBoxClick}
                title={`Click to upload ${label}`}
            >
                <input 
                    id={name}
                    name={name}
                    type="file" 
                    ref={fileInputRef} 
                    accept="image/png" 
                    required={required}
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
                    <div className="text-center text-muted-foreground p-2">
                        <UploadCloud className="h-8 w-8 mx-auto" />
                        <span className="text-xs">Upload Icon</span>
                    </div>
                )}
            </div>
        </div>
    )
}

export function PwaForm() {
    const [state, formAction] = useActionState(postPwaApp, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    
    useEffect(() => {
        if (state.status === 'success') {
            toast({ title: "Success", description: state.message });
            formRef.current?.reset();
            // Note: resetting file input previews would require more complex state management
        } else if (state.status === 'error') {
            toast({ variant: "destructive", title: "Error Posting App", description: state.message });
        }
    }, [state, toast]);


    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Post a New PWA</CardTitle>
                <CardDescription>
                    Provide the app's metadata and assets. These will be stored in your CDN and used to generate an installable app listing.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-8" encType="multipart/form-data">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-2">
                            <Label htmlFor="name">App Name</Label>
                            <Input id="name" name="name" placeholder="e.g., WNC Wallet & Escrow" required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="slug">App Slug (URL)</Label>
                            <Input id="slug" name="slug" placeholder="e.g., wnc-wallet (no spaces)" required pattern="[a-z0-9-]+" title="Only lowercase letters, numbers, and hyphens are allowed." />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">App Description</Label>
                        <Textarea id="description" name="description" placeholder="A short, compelling description of what this app does." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="manifest">Manifest JSON</Label>
                             <Textarea id="manifest" name="manifest" rows={10} placeholder='{\n  "name": "My App",\n  "short_name": "App",\n  "start_url": "/",\n  "display": "standalone",\n  ...\n}' required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serviceWorker">Service Worker JS</Label>
                             <Textarea id="serviceWorker" name="serviceWorker" rows={10} placeholder="self.addEventListener('install', (event) => ...);" required />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-6">
                        <IconUploader label="Icon (192x192)" name="icon192" required />
                        <IconUploader label="Icon (512x512)" name="icon512" required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="apk_url">APK / Fallback URL (Optional)</Label>
                        <Input id="apk_url" name="apk_url" type="url" placeholder="https://example.com/download.apk" />
                    </div>
                   
                    <SubmitButton className="w-full">Post App to CDN</SubmitButton>
                </form>
            </CardContent>
        </Card>
    )
}
