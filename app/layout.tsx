import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Navigation System",
  description: "Smart route planning with AI-powered navigation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
