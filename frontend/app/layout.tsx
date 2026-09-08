import { JetBrains_Mono, Figtree } from "next/font/google";
import { InitToast } from "@/components/init-toast";
import PaletteProvider from "@/providers/palette";
import ThemeProvider from "@/providers/theme";
import QueryProvider from "@/providers/query";
import type { Metadata } from "next";
import "./css/globals.css";
import { cn } from "@/lib/utils";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "Salon",
  description: "Salong platform."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn("font-sans", figtree.variable)}
    >
      <body
        className={`${figtree.variable} ${jetbrainsMono.variable} relative flex min-h-screen flex-col font-sans antialiased`}
      >
        <ThemeProvider>
          <PaletteProvider>
            <InitToast />
            <QueryProvider>{children}</QueryProvider>
          </PaletteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
