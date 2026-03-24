
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { PwaApp } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// In-memory cache
let cachedApps: PwaApp[] | null = null;

async function getPwaApps(): Promise<PwaApp[]> {
  if (cachedApps) {
    return cachedApps;
  }
  const { data, error } = await supabase
    .from("pwa_apps")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching PWA apps:", error);
    return [];
  }
  cachedApps = data || [];
  return cachedApps;
}

export default function ViewAppsPage() {
  const [apps, setApps] = useState<PwaApp[]>(cachedApps || []);
  const [loading, setLoading] = useState(!cachedApps);

  useEffect(() => {
    if (!cachedApps) {
      getPwaApps().then(data => {
        setApps(data);
        setLoading(false);
      });
    }
  }, []);

  return (
    <div className="w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">Installable Apps</h1>
        <p className="text-muted-foreground">
          Browse and install Progressive Web Apps hosted on this CDN.
        </p>
      </div>

      {loading ? (
         <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center h-96">
            <h3 className="text-xl font-semibold tracking-tight">Loading Apps...</h3>
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center h-96">
          <h3 className="text-xl font-semibold tracking-tight">No Apps Available Yet</h3>
          <p className="text-muted-foreground mt-2">
            The administrator has not posted any apps. Check back later!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map(app => (
                 <Card key={app.id}>
                    <CardHeader className="flex-row items-start gap-4">
                        <Image
                            src={app.icon_512_url}
                            alt={`${app.name} icon`}
                            width={64}
                            height={64}
                            className="rounded-lg bg-muted object-cover aspect-square"
                            unoptimized
                        />
                        <div className="flex-1">
                            <CardTitle>{app.name}</CardTitle>
                            <CardDescription className="line-clamp-3 mt-1">{app.description}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardFooter>
                       {/* TODO: This should link to a dynamic install page like /install/[slug] */}
                       <Button asChild className="w-full" disabled>
                          <Link href="#">
                              <Download className="mr-2 h-4 w-4" />
                              Install App (Coming Soon)
                          </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
