import type { Metadata } from "next";
import { Inter, Source_Code_Pro } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";

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
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
                    {children}
                </main>
            </div>
        </div>
        <BottomNav />
        <Toaster />
      </body>
    </html>
  );
}
