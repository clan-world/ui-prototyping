import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Clan World | The wild is calling",
  description: "Build your clan. Discover the wild. Collect a world of cards.",
  applicationName: "Clan World",
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
  themeColor: "#0b1413",
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
