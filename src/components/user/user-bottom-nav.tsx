
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { List, KeyRound, LayoutDashboard, Search, AppWindow } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Search", href: "/search", icon: Search },
  { name: "Tokens", href: "/tokens", icon: List },
  { name: "Apps", href: "/view-apps", icon: AppWindow },
  { name: "API Keys", href: "/api-keys", icon: KeyRound },
];

export function UserBottomNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "inline-flex flex-col items-center justify-center px-2 sm:px-5 hover:bg-accent group",
              pathname === item.href ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px] sm:text-xs">{item.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
