/* Google Analytics 4.
 *
 * Loaded from a bundled module rather than the inline <script> Google hands
 * you, because `vercel.json` sets `script-src 'self'` and an inline block would
 * need `'unsafe-inline'` to run — weakening the policy for the whole app to add
 * a metrics tag. Bundled, gtag.js is injected by first-party code and only the
 * googletagmanager origin has to be allowed.
 *
 * Both guards below exist to keep the property free of traffic that isn't a
 * real visitor. Neither is cosmetic: the Playwright suite drives `vp dev`
 * through 47 tests with two retries in CI, so an ungated tag would write a few
 * hundred bot pageviews into the property on every pull request.
 */

/** The GA4 property for qr-code-gen.frontsail.app. */
const MEASUREMENT_ID = "G-EG7WEH32WN";

/* Vercel builds previews in production mode too, so `import.meta.env.PROD`
   alone would report every PR deployment under the same property as the live
   site. Matching the canonical host in index.html is what separates them. */
const ANALYTICS_HOST = "qr-code-gen.frontsail.app";

declare global {
  interface Window {
    dataLayer?: IArguments[];
  }
}

/**
 * Loads gtag.js and records the initial pageview.
 *
 * A no-op outside a production build served from {@link ANALYTICS_HOST}, so dev
 * servers, the Playwright suite, and Vercel preview deployments never reach the
 * network.
 */
export function initAnalytics(): void {
  if (!import.meta.env.PROD) {
    return;
  }
  if (window.location.hostname !== ANALYTICS_HOST) {
    return;
  }

  const dataLayer = (window.dataLayer ??= []);

  /* Pushes `arguments`, not a rest array. gtag.js reads the raw arguments
     object off the queue, and this is the one part of Google's snippet worth
     copying verbatim rather than modernizing — hence the named-but-unused
     parameters, which exist only to give the call sites below a signature. */
  function gtag(_command: string, _payload: unknown): void {
    // oxlint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID);
}
