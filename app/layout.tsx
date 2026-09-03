import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Read My Bible: Read Anywhere, Grow Together",
  description: "A mobile-first Bible reading challenge for Favor Church Connect groups.",
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
