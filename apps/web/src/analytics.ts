/* Google Analytics 4 behind Consent Mode v2, in its "basic" form: gtag.js is
 * not fetched at all until the visitor accepts. Nothing reaches Google before
 * then — no tag, no cookieless ping — which is the only arrangement consistent
 * with the "your data never leaves your machine" claim the site makes about
 * itself.
 *
 * The advanced form (load the tag immediately with every signal denied, then
 * flip one) buys conversion modelling for declined visits. It was rejected
 * deliberately: it contacts Google before the visitor has answered, and the
 * modelling has no value for a site that runs no ads.
 *
 * Loaded from a bundled module rather than the inline <script> Google hands
 * you, because `vercel.json` sets `script-src 'self'` and an inline block would
 * need `'unsafe-inline'` to run — weakening the policy for the whole app to add
 * a metrics tag.
 */

/** The GA4 property for qr-code-gen.frontsail.app. */
const MEASUREMENT_ID = "G-EG7WEH32WN";

/* Vercel builds previews in production mode too, so `import.meta.env.PROD`
   alone would report every PR deployment under the same property as the live
   site. Matching the canonical host in index.html is what separates them. */
const ANALYTICS_HOST = "qr-code-gen.frontsail.app";

export const CONSENT_STORAGE_KEY = "qr-analytics-consent";

export type ConsentDecision = "granted" | "denied";

declare global {
  interface Window {
    dataLayer?: IArguments[];
  }
}

let tagRequested = false;

/**
 * Whether analytics would actually run here.
 *
 * The banner is deliberately *not* gated on this — it renders wherever a
 * decision is missing, so the consent flow stays exercisable in dev and by the
 * Playwright suite. Only the effect of accepting is environment-bound.
 */
export function analyticsEnabled(): boolean {
  return import.meta.env.PROD && window.location.hostname === ANALYTICS_HOST;
}

export function readConsent(): ConsentDecision | null {
  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    /* Private browsing and blocked storage both throw. Treat an unreadable
       decision as no decision: asking twice is recoverable, silently measuring
       someone who declined is not. */
    return null;
  }
}

export function writeConsent(decision: ConsentDecision): void {
  try {
    localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    /* A decision we cannot persist still governs this page view. */
  }
}

type GtagFn = (command: string, a?: unknown, b?: unknown) => void;

function pushToDataLayer(): GtagFn {
  const dataLayer = (window.dataLayer ??= []);
  /* Pushes `arguments`, not a rest array. gtag.js reads the raw arguments
     object off the queue, and this is the one part of Google's snippet worth
     copying verbatim rather than modernizing — hence the named-but-unused
     parameters, which exist only to give the call sites a signature. */
  return function gtag(_command: string, _a?: unknown, _b?: unknown): void {
    dataLayer.push(arguments);
  };
}

/**
 * Queues the Consent Mode v2 defaults and, for a visitor who already accepted,
 * loads the tag.
 *
 * The defaults land in `dataLayer` before gtag.js is ever fetched, so whenever
 * the tag does load it replays default-then-update in order and never runs a
 * single beat unconsented.
 */
export function initAnalytics(): void {
  if (!analyticsEnabled()) {
    return;
  }

  const gtag = pushToDataLayer();

  /* All four v2 signals start denied. `ad_*` are declared even though this site
     runs no ads: Consent Mode treats an unspecified signal as unknown rather
     than denied, and leaving them unstated is what trips the EEA enforcement
     checks. They are never granted below — accepting analytics is not
     accepting advertising. */
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
  });

  if (readConsent() === "granted") {
    applyGrant(gtag);
  }
}

function loadTag(): void {
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

function applyGrant(gtag: GtagFn): void {
  gtag("consent", "update", { analytics_storage: "granted" });
  /* `js` and `config` are what open a session, so they fire once per page load
     however many times consent is toggled. Without this guard, off-on-off-on in
     the footer would stack duplicate pageviews on the same visit. */
  if (!tagRequested) {
    tagRequested = true;
    loadTag();
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID);
  }
}

/**
 * Deletes the cookies GA4 wrote while consent was held.
 *
 * Withdrawal has to leave no identifier behind, and `analytics_storage: denied`
 * only stops GA writing new ones — the `_ga` client ID already on the machine
 * would survive and re-identify the visitor if they ever opted back in.
 *
 * Cleared against both the exact host and the dot-prefixed registrable domain
 * because GA sets them on the latter, and a `document.cookie` deletion only
 * takes effect when domain and path match the original write.
 */
function clearAnalyticsCookies(): void {
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0]?.trim())
    .filter((n): n is string => !!n && (n === "_ga" || n.startsWith("_ga_")));

  const host = window.location.hostname;
  const domains = [host, `.${host}`, `.${host.split(".").slice(-2).join(".")}`];

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Path=/; Domain=${domain}; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
    }
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT`;
  }
}

/**
 * Records the decision and applies it immediately.
 *
 * Turning it back off mid-session cannot unload a script that has already run,
 * so withdrawal is enforced two ways: `analytics_storage: denied` stops
 * collection now, and the absence of a stored grant stops the tag being fetched
 * at all on the next load.
 */
export function setConsent(granted: boolean): void {
  writeConsent(granted ? "granted" : "denied");
  if (!analyticsEnabled()) {
    return;
  }
  const gtag = pushToDataLayer();
  if (granted) {
    applyGrant(gtag);
  } else {
    gtag("consent", "update", { analytics_storage: "denied" });
    clearAnalyticsCookies();
  }
}
