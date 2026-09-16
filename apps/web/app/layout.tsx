import type { Metadata, Viewport } from "next";
import { assetPath, publicAssetCss } from "../lib/asset-path";
import "./medieval.css";
import "./realm.css";

export const metadata: Metadata = {
  title: "Clan World | Elders’ Reach",
  description:
    "Command a medieval clan. Lead your clansmen, build a village, and write its history.",
  applicationName: "Clan World",
  icons: { icon: assetPath("/icon.svg") },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Clan World",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#30291f",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <style>{publicAssetCss()}</style>
        {children}
      </body>
    </html>
  );
}
