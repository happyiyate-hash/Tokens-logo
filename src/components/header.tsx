
"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export function Header() {
    const router = useRouter();
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Token Logo CDN
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
            <Button variant="outline" onClick={() => router.push('/add-token')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Token
            </Button>
             <Button onClick={() => router.push('/networks')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Network
            </Button>
        </div>
      </div>
    </header>
  );
}
