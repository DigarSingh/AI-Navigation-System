import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NavIndia - AI Navigation System",
  description: "High-precision highway route planning across India with real road networks and ML travel time predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full overflow-hidden no-scrollbar" suppressHydrationWarning>
      <body className="h-full w-full overflow-hidden no-scrollbar antialiased selection:bg-blue-500 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
