
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { List, KeyRound, LayoutDashboard, Search, Network as NetworkIcon } from "lucide-react";
import { Logo } from "@/components/logo";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Search", href: "/search", icon: Search },
  { name: "Manage Tokens", href: "/tokens", icon: List },
  { name: "Manage Networks", href: "/networks", icon: NetworkIcon },
  { name: "API Keys", href: "/api-keys", icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
     <aside className="w-64 flex-col border-r bg-sidebar text-sidebar-foreground hidden md:flex">
      <div className="border-b p-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span>Token Logo CDN</span>
        </Link>
      </div>
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
