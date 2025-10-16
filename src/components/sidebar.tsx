"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Upload, List, KeyRound, LayoutDashboard, Search } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Search", href: "/search", icon: Search },
  { name: "Upload Token", href: "/upload-token", icon: Upload },
  { name: "Tokens List", href: "/tokens", icon: List },
  { name: "API Keys", href: "/api-keys", icon: KeyRound },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <div className="text-2xl font-bold mb-6">DCDN Dashboard</div>
      <nav>
        <ul>
          {navigation.map((item) => (
            <li key={item.name} className="mb-2">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 py-2 px-4 rounded transition duration-200",
                  pathname === item.href
                    ? "bg-gray-700"
                    : "hover:bg-gray-700"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
