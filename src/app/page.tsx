import Script from "next/script";
import { bodyHtml } from "./bodyMarkup";

// The markup below is extracted verbatim from the redesigned static design —
// layout, animations, and styling are untouched. Only the two API endpoint
// constants inside /public/site.js point at this project's own
// /api/contact and /api/book-call routes (they already did in the source
// file, so no substitution was needed this time).
//
// Library load order mirrors the original file exactly: GSAP core ->
// ScrollTrigger -> SplitText -> Lenis -> the page's own script, all
// executed in sequence via next/script's "afterInteractive" queue.
export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" strategy="afterInteractive" />
      <Script
        src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"
        strategy="afterInteractive"
      />
      <Script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" strategy="afterInteractive" />
      <Script src="/site.js" strategy="afterInteractive" />
    </>
  );
}
