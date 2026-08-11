import { History, PanelLeft, Terminal } from "lucide-react";
import { Logo } from "./Logo";
import { Badge, Button, IconButton } from "./ui";

interface HeaderProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
  onOpenDrawer: () => void;
  onOpenAgentSetup: () => void;
  hasContent: boolean;
}

export function Header({
  onToggleSidebar,
  sidebarOpen,
  onOpenDrawer,
  onOpenAgentSetup,
  hasContent,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 h-14 shrink-0 bg-[var(--surface-card)] border-b border-[var(--border-hairline)] flex items-center gap-3.5 px-4">
      <span className="hidden lg:inline-flex">
        <IconButton
          icon={PanelLeft}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          onClick={onToggleSidebar}
        />
      </span>
      <span className="lg:hidden">
        <IconButton icon={History} title="History" size="lg" onClick={onOpenDrawer} />
      </span>
      <span className="flex items-center gap-2.5">
        <Logo />
        <h1 className="text-[17px] font-semibold text-[var(--text-primary)]">QR Code Generator</h1>
      </span>
      <span className="hidden sm:block w-px h-[22px] bg-[var(--border-hairline)]" aria-hidden />
      <span className="hidden sm:block plico-label">Runs entirely in your browser</span>
      <span className="flex-1" />
      {/* The phone header has no room for this (~28px of slack at 390px), and
          the audience installing CLI tools is at a terminal anyway. */}
      <span className="hidden sm:inline-flex">
        <Button variant="secondary" size="sm" icon={Terminal} onClick={onOpenAgentSetup}>
          Agent setup
        </Button>
      </span>
      {hasContent ? (
        <Badge variant="ok" dot>
          Ready
        </Badge>
      ) : (
        <Badge variant="neutral" dot>
          Empty
        </Badge>
      )}
    </header>
  );
}
