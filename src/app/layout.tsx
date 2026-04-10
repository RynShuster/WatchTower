import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import Script from "next/script";
import { MAIN_THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "WatchTower",
  description: "CNC machine health",
};

const mainThemeInitScript = `
(function(){
  try {
    var k = ${JSON.stringify(MAIN_THEME_STORAGE_KEY)};
    var t = localStorage.getItem(k);
    if (t === "dark" || t === "light") {
      document.documentElement.setAttribute("data-main-theme", t);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className={inter.className}>
        <Script id="watchtower-main-theme" strategy="beforeInteractive">
          {mainThemeInitScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
