import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Gaze",
  description: "Membership Emergence Project <every else> — Our Gaze",
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
