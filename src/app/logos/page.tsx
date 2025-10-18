
"use client";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { TokenLogo } from "@/lib/types";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil } from "lucide-react";
import Link from "next/link";
import { EditLogoDialog } from "@/components/admin/edit-logo-dialog";
import { useEffect, useState } from "react";

// This is a client component, so we fetch data in a useEffect hook.
async function getLogos(): Promise<TokenLogo[]> {
  const { data, error } = await supabaseAdmin.rpc('get_all_token_logos');

  if (error) {
    console.error("[Client] Error fetching global logos:", error);
    return [];
  }
  return data || [];
}

export default function LogosPage() {
  const [logos, setLogos] = useState<TokenLogo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLogos().then(data => {
      setLogos(data);
      setLoading(false);
    });
  }, []);


  if (loading) {
    return (
      <div className="w-full space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
              Manage Global Logos
            </h1>
            <p className="text-muted-foreground">
              View, edit, and manage all globally available token logos in your collection.
            </p>
          </div>
          <Link href="/upload-token">
              <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Upload New Logo
              </Button>
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
            <h3 className="text-xl font-semibold tracking-tight">Loading Logos...</h3>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            Manage Global Logos
          </h1>
          <p className="text-muted-foreground">
            View, edit, and manage all globally available token logos in your collection.
          </p>
        </div>
        <Link href="/upload-token">
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Upload New Logo
            </Button>
        </Link>
      </div>

       <div className="space-y-4">
        {logos.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center">
              <h3 className="text-xl font-semibold tracking-tight">No Global Logos Found</h3>
              <p className="text-muted-foreground mt-2">
                It looks like there are no logos in your database. Use the "Upload Logo" button to add one.
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
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EditLogoDialog logo={logo}>
                        <Button variant="ghost" size="icon" title="Edit Logo">
                            <Pencil className="h-4 w-4" />
                        </Button>
                      </EditLogoDialog>
                    </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
