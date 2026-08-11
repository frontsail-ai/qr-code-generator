/* The discovery surface (#79): the page's indexable words, below the fold so
   the workspace keeps the first viewport to itself. Everything here is static
   JSX on purpose — the prerender ships it in dist/index.html, so crawlers
   that never run JavaScript read the same words a person scrolls to. */

const NOTES: { title: string; body: React.ReactNode }[] = [
  {
    title: "Nothing leaves your machine",
    body: "The generator runs entirely in your browser — no server, no account, no upload. The design you see is computed on your own device and stored there. Analytics load only if you agree, and never see your codes.",
  },
  {
    title: "Codes never expire",
    body: "Your content is encoded directly into the code — no redirect through a shortening service, no subscription keeping the destination alive, no watermark on the way out. A code you print today scans for as long as QR codes scan.",
  },
  {
    title: "Share links carry the design itself",
    body: "A share link packs the whole design into the URL fragment. The recipient's browser rebuilds it locally; nothing is stored on a server, so there is nothing to expire and nothing to leak.",
  },
  {
    title: "Scannability is measured, not guessed",
    body: "Colour combinations that would stop a phone camera are flagged before you download. The thresholds come from a decoder reading real renders — the same measurements that teach AI agents which designs will scan.",
  },
  {
    title: "Works from your code and your agents",
    body: (
      <>
        The generator is also an MCP server with an Agent Skill, so Claude Code, OpenAI Codex and
        other agents can design and generate codes directly — see Agent setup in the header, or{" "}
        <a
          href="https://github.com/frontsail-ai/qr-code-generator"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--ink-900)]"
        >
          the source on GitHub
        </a>
        .
      </>
    ),
  },
  {
    title: "Free, in the formats print shops want",
    body: "PNG at 2× resolution for screens, SVG for print at any size. Free without an asterisk: no sign-up, no watermark, no expiring tier.",
  },
];

export function AboutSection() {
  return (
    <section
      aria-labelledby="about-title"
      className="border-t border-[var(--border-hairline)] bg-[var(--surface-card)] pb-[calc(4rem+64px+var(--consent-inset))] lg:pb-[calc(4rem+var(--consent-inset))]"
    >
      <div className="mx-auto max-w-[720px] px-6 pt-14 flex flex-col gap-10">
        <div className="flex flex-col gap-2">
          <span className="plico-label text-[var(--text-muted)]">Notes</span>
          <h2 id="about-title" className="text-[19px] font-semibold text-[var(--text-primary)]">
            Why this generator
          </h2>
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            A QR code is a commitment — once printed, it has to keep working. The choices here are
            built around that.
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-x-10 gap-y-8">
          {NOTES.map((note) => (
            <div key={note.title} className="flex flex-col gap-1.5">
              <dt className="text-[14px] font-semibold text-[var(--text-primary)]">{note.title}</dt>
              <dd className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                {note.body}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
