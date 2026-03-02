import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers } from "@/components/providers/Providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { GoogleAnalytics } from "@next/third-parties/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AFCrashpad CRM",
  description: "Custom GoHighLevel-style CRM for Air Force Crashpad",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} h-screen bg-background antialiased overflow-hidden flex`}>
        <Providers>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <Sidebar />
            <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
              <TopNav />
              <main className="flex-1 min-h-0 overflow-y-auto bg-muted/20">
                {children}
              </main>
            </div>
          </ThemeProvider>
        </Providers>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
