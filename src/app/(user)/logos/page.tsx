
"use client";

import { supabase } from "@/lib/supabase/client";
import type { TokenLogo } from "@/lib/types";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

// Simple in-memory cache
let cachedLogos: TokenLogo[] | null = null;

async function getLogos(): Promise<TokenLogo[]> {
  if (cachedLogos) {
    return cachedLogos;
  }
  const { data, error } = await supabase.rpc('get_all_token_logos');

  if (error) {
    console.error("[Client] Error fetching global logos:", error);
    return [];
  }
  cachedLogos = data || [];
  return cachedLogos;
}

export default function ViewLogosPage() {
  const [logos, setLogos] = useState<TokenLogo[]>(cachedLogos || []);
  const [loading, setLoading] = useState(!cachedLogos);

  useEffect(() => {
    // Only fetch if the cache is empty on initial load
    if (!cachedLogos) {
      getLogos().then(data => {
        setLogos(data);
        setLoading(false);
      });
    }
  }, []);

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
          Global Logo Library
        </h1>
        <p className="text-muted-foreground">
          Browse all globally available token logos in the CDN collection.
        </p>
      </div>

       <div className="space-y-4">
        {loading ? (
             <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
                <h3 className="text-xl font-semibold tracking-tight">Loading Logos...</h3>
            </div>
        ) : logos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
              <h3 className="text-xl font-semibold tracking-tight">No Global Logos Found</h3>
              <p className="text-muted-foreground mt-2">
                The administrator has not added any logos yet.
              </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
            {logos.map((logo) => (
              <Card key={logo.id} className="group relative flex flex-col overflow-hidden text-center">
                <CardHeader className="flex-col items-center justify-center p-4">
                  <div 
                    className="relative h-16 w-16 sm:h-20 sm:w-20"
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <Image
                      src={logo.public_url}
                      alt={`${logo.symbol} logo`}
                      fill
                      className="rounded-full bg-muted object-cover"
                      unoptimized
                    />
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 p-4 pt-0">
                   <CardTitle className="text-base sm:text-lg font-bold truncate">{logo.name || logo.symbol}</CardTitle>
                </CardContent>
                 <CardFooter className="p-2 bg-muted/50">
                    <Badge variant="secondary" className="mx-auto">{logo.symbol}</Badge>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
