import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Public site URL — used to resolve absolute Open Graph / canonical URLs.
// Override via NEXT_PUBLIC_SITE_URL; update the fallback to your real domain.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://freedom-fly.online";

const TITLE = "Freedom Fly — Free Online Flight Simulator";
const DESCRIPTION =
  "Play Freedom Fly, a free flight simulator in your browser — no download. " +
  "Take off, soar over endless mountains, and land where you dare. Real " +
  "aerodynamics: stalls, wind, flaps, g-stress and landings. Keyboard, mouse, " +
  "touch and gamepad.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Freedom Fly",
  },
  description: DESCRIPTION,
  applicationName: "Freedom Fly",
  keywords: [
    "flight simulator",
    "free flight simulator",
    "online flight simulator",
    "browser flight simulator",
    "flight simulator online",
    "flight sim",
    "free flight sim",
    "airplane game",
    "plane game",
    "flying game",
    "fly a plane online",
    "3d flight game",
    "web game",
    "browser game",
    "no download game",
    "play in browser",
    "WebGPU game",
    "Cessna simulator",
    "flight game free",
    "freedom fly",
  ],
  authors: [{ name: "Sofiane Khoudour", url: "https://github.com/skmercur/" }],
  creator: "Sofiane Khoudour",
  category: "game",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Freedom Fly",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/web-app-manifest-512x512.png",
        width: 512,
        height: 512,
        alt: "Freedom Fly — free online flight simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/web-app-manifest-512x512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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

// Structured data so search engines can show a rich "VideoGame" result.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "Freedom Fly",
  url: SITE_URL,
  description: DESCRIPTION,
  image: `${SITE_URL}/web-app-manifest-512x512.png`,
  genre: ["Flight simulator", "Simulation", "Casual"],
  applicationCategory: "Game",
  operatingSystem: "Web browser",
  gamePlatform: ["Web browser", "WebGPU"],
  playMode: "SinglePlayer",
  browserRequirements: "Requires a modern browser with WebGL2 or WebGPU.",
  author: {
    "@type": "Person",
    name: "Sofiane Khoudour",
    url: "https://github.com/skmercur/",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-[#05060f] font-sans text-white">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
