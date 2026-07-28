import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Nexus Swap",
  description: "Built with love",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading headers() opts this layout into per-request dynamic rendering,
  // which is required for the nonce middleware.ts sets to be valid (a
  // nonce baked into a statically-generated page would never match).
  headers().get("x-nonce");

  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster position="top-right" reverseOrder={false} />
      </body>
    </html>
  );
}
