import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "每日AI科技新闻",
  description: "每日最新AI与科技新闻聚合",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <Header />
        {children}
      </body>
    </html>
  );
}
