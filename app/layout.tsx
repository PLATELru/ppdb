import type { Metadata } from "next";
import "./globals.css";

const assetPrefix = process.env.GITHUB_PAGES === "true" ? "/ppdb" : "";

export const metadata: Metadata = {
  title: "Political Parties Database",
  description: "Open-source database of political parties worldwide.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: `${assetPrefix}/branding/PPDB.png`,
    shortcut: `${assetPrefix}/branding/PPDB.png`,
    apple: `${assetPrefix}/branding/PPDB.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
