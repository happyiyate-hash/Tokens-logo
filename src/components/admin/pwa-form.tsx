"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postPwaApp, type PostPwaAppState } from "@/lib/actions";

import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { UploadCloud } from "lucide-react";
import Image from "next/image";

const initialState: PostPwaAppState = { status: "idle" };

const FileInput = ({ label, name, required, helpText }: { label: string, name: string, required?: boolean, helpText: string }) => {
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }

    const handleReset = () => {
        setPreview(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }

    // Expose reset to parent
    if (inputRef.current) {
        (inputRef.current as any).handleReset = handleReset;
    }


    return (
        <div className="space-y-2">
            <Label htmlFor={name}>{label}</Label>
            <div 
                className="relative flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-card hover:bg-muted"
                onClick={() => inputRef.current?.click()}
            >
                <input ref={inputRef} id={name} name={name} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" required={required} onChange={handleFileChange}/>
                {preview ? (
                    <Image src={preview} alt="Preview" fill className="object-contain p-2" />
                ) : (
                    <div className="flex flex-col items-center justify-center text-center text-muted-foreground">
                        <UploadCloud className="w-8 h-8 mb-2" />
                        <p className="text-sm"><span className="font-semibold">Click to upload</span></p>
                        <p className="text-xs">{helpText}</p>
                    </div>
                )}
            </div>
        </div>
    );
};


export function PwaForm() {
    const [state, formAction] = useActionState(postPwaApp, initialState);
    const { toast } = useToast();
    const formRef = useRef<HTMLFormElement>(null);
    
    useEffect(() => {
        if (state.status === 'success') {
            toast({ title: "Success", description: state.message });
            formRef.current?.reset();
            // We need to manually trigger a reset on file input previews
            const fileInputs = formRef.current?.querySelectorAll('input[type="file"]');
            fileInputs?.forEach(input => {
                const file = input as HTMLInputElement & { handleReset?: () => void };
                const event = new Event('change', { bubbles: true });
                file.dispatchEvent(event);
            });

        } else if (state.status === 'error') {
            toast({ variant: "destructive", title: "Error Posting App", description: state.message });
        }
    }, [state, toast]);

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>PWA Uploader</CardTitle>
                <CardDescription>
                    Provide the app's metadata and assets. These details will be used to create a dynamic manifest for a rich install experience.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form ref={formRef} action={formAction} className="space-y-8" encType="multipart/form-data">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">App Full Name</Label>
                            <Input id="name" name="name" placeholder="e.g., WNC Wallet & Escrow" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="short_name">Short Name</Label>
                            <Input id="short_name" name="short_name" placeholder="e.g., WNC Wallet" required />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">App Description</Label>
                        <Textarea id="description" name="description" placeholder="A premium non-custodial wallet..." />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="start_url">Start URL</Label>
                            <Input id="start_url" name="start_url" placeholder="/app-home" defaultValue="/" required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="theme_color">Theme Color</Label>
                            <Input id="theme_color" name="theme_color" type="color" defaultValue="#8A2BE2" className="h-10 p-1" />
                        </div>
                    </div>
                    
                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">App Icons</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FileInput label="App Icon (512x512)" name="icon_512" helpText="Required high-res icon" required />
                           <FileInput label="App Icon (192x192)" name="icon_192" helpText="Required mid-res icon" required />
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <h3 className="text-lg font-medium">Store Screenshots (Optional)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <FileInput label="Mobile Screenshot" name="screenshot_1" helpText="e.g., a tall image" />
                           <FileInput label="Desktop/Wide Screenshot" name="screenshot_2" helpText="e.g., a wide image" />
                        </div>
                    </div>
                   
                    <SubmitButton className="w-full">Upload & Post App</SubmitButton>
                </form>
            </CardContent>
        </Card>
    )
}
