import type { Metadata, Viewport } from "next";
import Script from "next/script";

// Explicit mobile viewport + browser-chrome tint (matches --bg in site.css), so
// the Android address bar / iOS status area blend into the page instead of
// showing black bars above the navy hero.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#041b2e",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://forgeaistudios.com"),
  title: "Forge AI Studios: Forging Intelligent Digital Experiences",
  description:
    "Forge AI Studios designs and builds websites, ecommerce, AI automation and performance marketing systems built to last.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Forge AI Studios",
    title: "Forge AI Studios: Forging Intelligent Digital Experiences",
    description:
      "Forge AI Studios designs and builds websites, ecommerce, AI automation and performance marketing systems built to last.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forge AI Studios: Forging Intelligent Digital Experiences",
    description:
      "Forge AI Studios designs and builds websites, ecommerce, AI automation and performance marketing systems built to last.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital,wght@0,400;1,400&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* Tailwind Play CDN (preflight disabled to preserve the hand-written design) */}
        <Script src="https://cdn.tailwindcss.com" strategy="beforeInteractive" />
        <Script src="/tailwind-config.js" strategy="beforeInteractive" />
        {/* Original site stylesheet — extracted verbatim, unmodified. */}
        <link rel="stylesheet" href="/site.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
