import { Check, Copy, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentSection } from "../content/agentSetup";
import { AGENT_SETUP_SECTIONS, REPO_URL } from "../content/agentSetup";
import { Button, IconButton, Note, SectionLabel } from "./ui";

/* The app's first modal, and native <dialog> + showModal() is why it can be
   this small: focus containment, Escape, focus restore to the trigger, and
   the top layer all come from the platform. The top layer also decides where
   feedback goes — the toast paints at z-30, underneath the ::backdrop, so a
   copy confirms on the button and a failure reports inline, never via toast. */

interface AgentSetupDialogProps {
  /* Fired by the native close event whatever closed it — Escape, the X, or a
     backdrop click. The parent unmounts the component in response, so idle
     mounts nothing. */
  onClose: () => void;
}

export function AgentSetupDialog({ onClose }: AgentSetupDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="agent-setup-title"
      onClose={onClose}
      onClick={(event) => {
        /* Padding lives on the inner column, so a click landing on the dialog
           element itself can only be the backdrop. */
        if (event.target === ref.current) ref.current?.close();
      }}
      className="m-auto w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] p-0 bg-[var(--surface-card)] text-[var(--text-primary)] rounded-[5px] border border-[var(--border-hairline)] shadow-[var(--shadow-lg)] backdrop:bg-[rgba(27,24,18,0.45)]"
    >
      <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[inherit] min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 flex flex-col gap-1.5">
            <span className="plico-label text-[var(--text-muted)]">Agent setup</span>
            <h2 id="agent-setup-title" className="text-[17px] font-semibold leading-tight">
              Use it from your agent
            </h2>
          </div>
          <IconButton icon={X} title="Close" onClick={() => ref.current?.close()} />
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--text-secondary)] -mt-2">
          The MCP server generates the codes — the skill teaches your agent which designs will
          actually scan.
        </p>
        {AGENT_SETUP_SECTIONS.map((section, index) => (
          <CommandBlock key={section.id} section={section} index={index} />
        ))}
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:underline self-start"
        >
          Source · github.com/frontsail-ai/qr-code-generator
        </a>
      </div>
    </dialog>
  );
}

function CommandBlock({ section, index }: { section: AgentSection; index: number }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const revert = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(revert.current), []);

  const copy = () => {
    navigator.clipboard
      .writeText(section.commands.map((command) => command.text).join("\n"))
      .then(() => {
        setStatus("copied");
        window.clearTimeout(revert.current);
        revert.current = window.setTimeout(() => setStatus("idle"), 2000);
      })
      .catch(() => setStatus("failed"));
  };

  return (
    <section className="flex flex-col gap-2 min-w-0" aria-label={section.title}>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <SectionLabel>{`0${index + 1} — ${section.title}`}</SectionLabel>
        </div>
        <Button
          size="sm"
          variant="secondary"
          icon={status === "copied" ? Check : Copy}
          aria-label={`Copy ${section.title} commands`}
          onClick={copy}
        >
          {status === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      {/* Pre-existing live region: it must already be mounted to announce. */}
      <span className="sr-only" role="status">
        {status === "copied" ? `${section.title} commands copied` : ""}
      </span>
      {section.note && (
        <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{section.note}</p>
      )}
      <div className="bg-[var(--surface-sunken)] border border-[var(--border-hairline)] rounded-[2px] p-3 overflow-x-auto">
        {section.commands.map((command) => (
          <div key={command.text} className="whitespace-pre font-mono text-[12px] leading-[1.7]">
            {command.text}
            {command.comment && (
              <span className="text-[var(--text-muted)]">{`   # ${command.comment}`}</span>
            )}
          </div>
        ))}
      </div>
      {status === "failed" && (
        <Note variant="error" role="alert">
          Copy failed — select the commands and copy them by hand.
        </Note>
      )}
    </section>
  );
}
