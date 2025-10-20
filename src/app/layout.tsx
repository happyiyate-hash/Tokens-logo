import { Inter, Source_Code_Pro } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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
        {children}
        <Toaster />
      </body>
    </html>
  );
}
