import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forge AI Studios: Forging Intelligent Digital Experiences",
  description:
    "Forge AI Studios designs and builds websites, ecommerce, AI automation and performance marketing systems built to last.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* Original site stylesheet — extracted verbatim, unmodified. */}
        <link rel="stylesheet" href="/site.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
