
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { List, LayoutDashboard, Network as NetworkIcon, PlusCircle, Upload, Image as ImageIcon, PackagePlus } from "lucide-react";
import { Logo } from "@/components/logo";

const navigation = [
  { name: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Manage Tokens", href: "/admin/tokens", icon: List },
  { name: "Manage Logos", href: "/admin/logos", icon: ImageIcon },
  { name: "Add Token (Auto)", href: "/admin/add-token", icon: PlusCircle },
  { name: "Upload Logo (Manual)", href: "/admin/upload-token", icon: Upload },
  { name: "Post PWA App", href: "/admin/post-apps", icon: PackagePlus },
  { name: "Manage Networks", href: "/admin/networks", icon: NetworkIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
     <aside className="w-64 flex-col border-r bg-background hidden md:flex">
      <div className="border-b p-4 h-16 flex items-center">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <span>Token Logo CDN <span className="text-xs text-primary">[Admin]</span></span>
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-4">
        <ul className="space-y-1">
          {navigation.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
       <div className="border-t p-4">
          <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-accent/50">
            <span>&larr; Exit Admin View</span>
          </Link>
      </div>
    </aside>
  );
}
