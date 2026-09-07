import type { Metadata, Viewport } from "next";
import "./medieval.css";

export const metadata: Metadata = {
  title: "Clan World | Elders’ Reach",
  description:
    "Command a medieval clan. Lead your clansmen, build a village, and write its history.",
  applicationName: "Clan World",
  icons: { icon: "/icon.svg" },
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
      <body>{children}</body>
    </html>
  );
}
