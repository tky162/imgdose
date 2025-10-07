import { AppShell } from "@/components/layout/app-shell";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "imgdose 管理コンソール",
  description: "Cloudflare R2 / Workers / D1 で構築した画像管理システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
