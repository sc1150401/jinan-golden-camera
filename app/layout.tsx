import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "2026 金安獎｜金安無限・交通之光",
  description: "套用典雅金光動態，拍攝你的 2026 金安獎紀念畫面。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body className="antialiased">{children}</body>
    </html>
  );
}
