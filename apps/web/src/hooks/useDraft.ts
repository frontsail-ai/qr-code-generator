import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Customization, DesignState, FormDataMap, QRType } from "@frontsail/qr-core";
import { DEFAULT_CUSTOMIZATION, DEFAULT_FORM_DATA, normalizeDesign } from "@frontsail/qr-core";
import { keysWithPrefix, readItem, removeItem, writeItem } from "../utils/safeStorage";

/* The single owner of the design the user is working on.
 *
 * Before this hook the three atoms lived as bare `useState` in App and the only
 * writer to storage was the history save, which fires from the download button:
 * work that had not been exported yet was not stored anywhere, so a refresh
 * threw it away without a word (#42). Durability is a property of the working
 * state itself, not a side effect of exporting, so the state and its storage
 * live together here.
 *
 * ## One slot per tab
 *
 * The draft is keyed by a tab id kept in `sessionStorage`, which is per-tab and
 * survives a reload of that tab — exactly the lifetime a draft wants. A single
 * shared key would make two open tabs fight over one slot and hand whichever
 * reloaded first the other one's design; per-tab slots remove the contest
 * instead of refereeing it, with no lease, heartbeat or staleness clock.
 *
 * A tab with no slot of its own — a fresh one, or one returning the next day —
 * adopts the most recently written draft so the work is where the user left it.
 * Adoption is not ownership: a tab writes nothing until the user edits in it, so
 * merely opening a second tab cannot disturb the first one's draft.
 */

const TAB_ID_KEY = "qr-tab-id";
const DRAFT_PREFIX = "qr-draft:";
/* Long enough to cover a weekend away from a tab left open, short enough that
   abandoned slots do not sit in a ~5 MB budget shared with history forever. */
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SLOTS = 5;
/* Long enough that a sentence being typed is one write rather than thirty,
   short enough that a refresh a moment after the last keystroke still finds it. */
const WRITE_DELAY_MS = 500;

export type DraftStatusKind = "logo-dropped" | "logo-lost" | "quota" | "unavailable";

export interface DraftStatus {
  kind: DraftStatusKind;
  variant: "warn" | "error";
  message: string;
}

const STATUS: Record<DraftStatusKind, DraftStatus> = {
  /* The design was kept, the logo was not — say so while the user can still act
     on it, because the logo is on screen and everything looks fine. */
  "logo-dropped": {
    kind: "logo-dropped",
    variant: "warn",
    message:
      "Browser storage is full, so this logo won't come back if you reload. Download the code to keep it.",
  },
  "logo-lost": {
    kind: "logo-lost",
    variant: "warn",
    message:
      "Storage was full when this design was last saved, so its logo could not be restored with it.",
  },
  quota: {
    kind: "quota",
    variant: "error",
    message:
      "Browser storage is full — this design won't be restored if you reload. Download it to keep it.",
  },
  unavailable: {
    kind: "unavailable",
    variant: "warn",
    message: "This browser is blocking storage, so this design won't be restored if you reload.",
  },
};

interface DraftRecord {
  v: 1;
  updatedAt: number;
  logoDropped?: boolean;
  qrType: QRType;
  formData: FormDataMap;
  customization: Customization;
}

interface StoredSlot {
  key: string;
  record: DraftRecord;
  design: DesignState;
}

function tabId(): string {
  const existing = readItem(TAB_ID_KEY, "session");
  if (existing) return existing;
  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  writeItem(TAB_ID_KEY, id, "session");
  return id;
}

/* A slot outlives the code that wrote it, so everything about it is checked
   rather than assumed — `normalizeDesign` owns the design half, and the
   envelope is version-gated here. */
function readSlot(key: string): StoredSlot | null {
  const raw = readItem(key);
  if (!raw) return null;

  try {
    const record = JSON.parse(raw) as DraftRecord;
    if (record?.v !== 1 || typeof record.updatedAt !== "number") return null;
    const design = normalizeDesign(record);
    return design ? { key, record, design } : null;
  } catch {
    return null;
  }
}

function readSlots(): StoredSlot[] {
  return keysWithPrefix(DRAFT_PREFIX)
    .map(readSlot)
    .filter((slot): slot is StoredSlot => slot !== null)
    .sort((a, b) => b.record.updatedAt - a.record.updatedAt);
}

/* Identifies a design by its content alone. Two renders of the same design
   share a fingerprint however many times React re-created the objects. */
function fingerprint(design: DesignState): string {
  return JSON.stringify([design.qrType, design.formData, design.customization]);
}

/* Drops slots belonging to tabs that are never coming back. Runs on load and
   again as the first response to a full-storage write, where reclaiming a dead
   tab's draft is the cheapest room available. Never touches this tab's slot. */
function collectGarbage(ownKey: string): void {
  const expired = Date.now() - DRAFT_TTL_MS;
  const others = readSlots().filter((slot) => slot.key !== ownKey);

  for (const [index, slot] of others.entries()) {
    if (slot.record.updatedAt < expired || index >= MAX_SLOTS - 1) removeItem(slot.key);
  }
}

export interface DraftController {
  qrType: QRType;
  setQRType: (type: QRType) => void;
  formData: FormDataMap;
  setFormData: Dispatch<SetStateAction<FormDataMap>>;
  customization: Customization;
  setCustomization: Dispatch<SetStateAction<Customization>>;
  /** Replaces the whole design at once — a restored history entry, a share link. */
  applyDesign: (design: DesignState) => void;
  /** Tries the draft again after something else has freed space. */
  retryPersist: () => void;
  status: DraftStatus | null;
}

/**
 * `sharedDesign` is the design decoded from the URL hash on a cold load, if
 * there was one. A link the user just followed is what they asked to see, so it
 * outranks anything in storage.
 */
export function useDraft(sharedDesign: DesignState | null): DraftController {
  /* Everything below has to agree on one tab id and one restored slot, and both
     are read from storage — so they are resolved once, on the first render. */
  const [boot] = useState(() => {
    const id = tabId();
    const ownKey = `${DRAFT_PREFIX}${id}`;
    collectGarbage(ownKey);

    const own = readSlot(ownKey);
    // A tab with no draft of its own picks up the newest one going
    const restored = own ?? readSlots()[0] ?? null;

    return { ownKey, restored, adopted: !own && restored !== null };
  });

  const restoredDesign = sharedDesign ?? boot.restored?.design ?? null;

  const [qrType, setQRTypeState] = useState<QRType>(restoredDesign?.qrType ?? "url");
  const [formData, setFormDataState] = useState<FormDataMap>(
    restoredDesign?.formData ?? DEFAULT_FORM_DATA,
  );
  const [customization, setCustomizationState] = useState<Customization>(
    restoredDesign?.customization ?? DEFAULT_CUSTOMIZATION,
  );
  const [status, setStatus] = useState<DraftStatus | null>(() =>
    !sharedDesign && boot.restored?.record.logoDropped ? STATUS["logo-lost"] : null,
  );
  /* A failed write is only retried when something changes, and a full disk is
     not a change the app can see. Deleting a saved code frees exactly the room
     the draft was short of, so the caller gets to say "try again now" — without
     it, the warning would stand until the next keystroke while the design it
     warns about could in fact be stored. */
  const [retries, setRetries] = useState(0);
  const retryPersist = useCallback(() => setRetries((n) => n + 1), []);

  /* Adopting another tab's draft is not editing. Until the user changes
     something in *this* tab there is nothing here worth keeping that is not
     already kept, and writing anyway would have every opened tab claim a slot.

     A followed share link is the exception: the hash is stripped from the
     address bar as it is applied, so until this design is written down it
     exists nowhere at all — which is how a shared design came to survive
     exactly until its first reload. */
  const edited = useRef(sharedDesign !== null);
  const lastWritten = useRef<string | null>(
    !sharedDesign && !boot.adopted && boot.restored ? fingerprint(boot.restored.design) : null,
  );

  const markEdited = useCallback(() => {
    edited.current = true;
  }, []);

  const setQRType = useCallback(
    (type: QRType) => {
      markEdited();
      setQRTypeState(type);
    },
    [markEdited],
  );

  const setFormData = useCallback<DraftController["setFormData"]>(
    (update) => {
      markEdited();
      setFormDataState(update);
    },
    [markEdited],
  );

  const setCustomization = useCallback<DraftController["setCustomization"]>(
    (update) => {
      markEdited();
      setCustomizationState(update);
    },
    [markEdited],
  );

  const applyDesign = useCallback(
    (design: DesignState) => {
      markEdited();
      setQRTypeState(design.qrType);
      setFormDataState(design.formData);
      setCustomizationState(design.customization);
    },
    [markEdited],
  );

  useEffect(() => {
    if (!edited.current) return;

    const timer = setTimeout(() => {
      const record: DraftRecord = {
        v: 1,
        updatedAt: Date.now(),
        qrType,
        formData,
        customization,
      };

      const serialized = JSON.stringify(record);
      /* Re-rendering is not re-writing. A 2 MB logo serializes to ~2.8 M
         characters, over half the origin's whole budget — worth comparing
         before spending. The timestamp is excluded from the comparison so an
         unchanged design does not look new every time. */
      const current = fingerprint({ qrType, formData, customization });
      if (current === lastWritten.current) return;

      let result = writeItem(boot.ownKey, serialized);

      if (!result.ok && result.reason === "quota") {
        // Cheapest room first: drafts left behind by tabs that are gone
        collectGarbage(boot.ownKey);
        result = writeItem(boot.ownKey, serialized);
      }

      if (!result.ok && result.reason === "quota" && customization.logo) {
        /* The logo is almost always what filled storage, and it is the one part
           of the design the user still has a copy of — it came from a file on
           their machine. Everything else is only here. */
        const withoutLogo: DraftRecord = {
          ...record,
          logoDropped: true,
          customization: { ...customization, logo: null },
        };
        result = writeItem(boot.ownKey, JSON.stringify(withoutLogo));
        if (result.ok) {
          lastWritten.current = current;
          setStatus(STATUS["logo-dropped"]);
          return;
        }
      }

      if (!result.ok) {
        setStatus(result.reason === "quota" ? STATUS.quota : STATUS.unavailable);
        return;
      }

      lastWritten.current = current;
      setStatus(null);
    }, WRITE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [qrType, formData, customization, boot.ownKey, retries]);

  return {
    qrType,
    setQRType,
    formData,
    setFormData,
    customization,
    setCustomization,
    applyDesign,
    retryPersist,
    status,
  };
}
