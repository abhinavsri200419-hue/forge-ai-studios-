import Script from "next/script";
import { bodyHtml } from "./bodyMarkup";

// The markup below is extracted verbatim from the original static design —
// layout, animations, and styling are untouched. Only the two API endpoint
// constants inside /public/site.js were repointed from the Formspree
// placeholders to this project's own /api/contact and /api/book-call routes.
export default function HomePage() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
      <Script src="/site.js" strategy="afterInteractive" />
    </>
  );
}
