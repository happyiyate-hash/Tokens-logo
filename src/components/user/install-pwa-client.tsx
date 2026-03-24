"use client";

import { useEffect } from "react";
import type { PwaApp } from "@/lib/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function InstallPwaClient({ app }: { app: PwaApp }) {

    useEffect(() => {
        // Dynamically add the manifest link
        const manifestLink = document.createElement('link');
        manifestLink.rel = 'manifest';
        manifestLink.href = app.manifest_url;
        document.head.appendChild(manifestLink);

        // Register the service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(app.service_worker_url)
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        }

        // Cleanup on component unmount
        return () => {
            if (document.head.contains(manifestLink)) {
                document.head.removeChild(manifestLink);
            }
            // Note: Service worker registrations are persistent and don't need to be unregistered on unmount.
        };
    }, [app.manifest_url, app.service_worker_url]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <Image
                        src={app.icon_512_url}
                        alt={`${app.name} icon`}
                        width={96}
                        height={96}
                        className="rounded-2xl bg-muted object-cover aspect-square mx-auto mb-4"
                        unoptimized
                    />
                    <CardTitle className="text-3xl">{app.name}</CardTitle>
                    <CardDescription>{app.description || "Install this application on your device for a native-like experience."}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>How to Install</AlertTitle>
                        <AlertDescription>
                            Your browser should prompt you to "Install" or "Add to Home Screen". Follow the on-screen instructions. If you don't see a prompt, look for an install icon in your browser's address bar.
                        </AlertDescription>
                    </Alert>
                </CardContent>
                {app.apk_url && (
                    <CardFooter>
                         <Button asChild className="w-full" variant="secondary">
                           <a href={app.apk_url} download>
                                <Download className="mr-2 h-4 w-4" />
                                Download APK for Android
                           </a>
                        </Button>
                    </CardFooter>
                )}
            </Card>
        </div>
    );
}
