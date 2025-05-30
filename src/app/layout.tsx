import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loyalty Dashboard",
  description: "Track top customers by visits and spend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
