"use client";

import { Inter, Source_Code_Pro } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { usePathname } from "next/navigation";
import { UserHeader } from "@/components/user/user-header";
import { UserSidebar } from "@/components/user/user-sidebar";
import { UserBottomNav } from "@/components/user/user-bottom-nav";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminBottomNav } from "@/components/admin/admin-bottom-nav";


const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-code",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  const LayoutComponent = isAdminRoute ? AdminLayout : UserLayout;

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <title>Token Logo CDN</title>
        <meta name="description" content="A CDN for token logos with Supabase and Next.js" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          fontInter.variable,
          fontSourceCodePro.variable
        )}
      >
        <LayoutComponent>{children}</LayoutComponent>
        <Toaster />
      </body>
    </html>
  );
}

function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <UserSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <UserHeader />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <UserBottomNav />
    </div>
  );
}

function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="flex h-screen bg-background text-foreground">
          <AdminSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
              <AdminHeader />
              <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                  {children}
              </main>
          </div>
          <AdminBottomNav />
      </div>
    );
  }