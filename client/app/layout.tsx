import "./globals.css";
import type { Metadata } from "next";
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
 
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
        <Toaster position="top-right" reverseOrder={false} />
      </body>
    </html>
  );
}
