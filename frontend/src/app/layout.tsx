import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEOGEO | Visibility Audits for AI Search",
  description:
    "Check how LLM crawlers and AI assistants interpret your site, entities, and GEO readiness.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
