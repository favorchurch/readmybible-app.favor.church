import type { Metadata } from "next";
import "./globals.css";
import ReactDOM from "react-dom";

import { FontReadyGate } from "@/components/font-ready-gate";

const title = "Read My Bible";
const description = "Read anywhere. Grow together.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_BASE_URL ?? "https://readmybible-app.favor.church"),
  title,
  description,
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Must run during render, not at module scope: React only attaches resource
  // hints to the response stream from inside a render pass, so module-level
  // calls never reach the HTML.
  ReactDOM.preload("/fonts/FavorSans-Bold.otf", { as: "font", crossOrigin: "anonymous" });
  ReactDOM.preload("/fonts/Agharti-Bold.ttf", { as: "font", crossOrigin: "anonymous" });

  return (
    <html lang="en">
      <body><FontReadyGate>{children}</FontReadyGate></body>
    </html>
  );
}
