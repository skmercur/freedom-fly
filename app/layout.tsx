import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Freedom Fly — Endless WebGL Flyer",
  description:
    "Weave through an endless neon void, chain combos, dodge asteroids and grab power-ups. A polished browser game built with React Three Fiber.",
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
