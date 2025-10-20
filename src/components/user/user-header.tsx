
"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { KeyRound, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserHeader() {
    const router = useRouter();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Token Logo CDN
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2 md:space-x-4">
             <Button size="sm" onClick={() => router.push('/api-keys')}>
                <KeyRound className="mr-2 h-4 w-4" />
                Get API Key
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/admin/dashboard')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin
            </Button>
        </div>
      </div>
    </header>
  );
}
