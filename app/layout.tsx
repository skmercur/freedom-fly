import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Freedom Fly — Open-Sky Flight Sim",
  description:
    "Take off, soar over the mountains and land where you dare. A free-flight sim in the browser — WebGPU, real stalls, real landings, no downloads.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" }],
    apple: "/apple-touch-icon.png",
  },
};

// Lock zoom/scale so touch controls feel like a native game.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#05060f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#05060f] font-sans text-white">
        {children}
      </body>
    </html>
  );
}
