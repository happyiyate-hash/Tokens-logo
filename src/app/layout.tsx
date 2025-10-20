
import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { UserHeader } from "@/components/user/user-header";
import { UserSidebar } from "@/components/user/user-sidebar";
import { UserBottomNav } from "@/components/user/user-bottom-nav";
import { usePathname } from "next/navigation";


const fontInter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const fontSourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "Token Logo CDN",
  description: "A CDN for token logos with Supabase and Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This layout now ONLY applies to the user-facing pages.
  // The admin layout is handled separately in /app/(admin)/layout.tsx
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-body antialiased",
          fontInter.variable,
          fontSourceCodePro.variable
        )}
      >
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
        <Toaster />
      </body>
    </html>
  );
}
