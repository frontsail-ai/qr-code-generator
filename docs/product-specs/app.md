# The Workspace

The browser app at qr-code-gen.frontsail.app: designing, styling, exporting, keeping and sharing QR codes. Everything here runs client-side (see INV-16).

Prefix: `APP`.

---

### APP-1: Five content types

The designer offers URL, Email, Phone, Text and vCard, each with its own form. Exactly one type is active at a time; switching types preserves what was entered in the others.

### APP-2: The preview is live and the empty state is honest

The code redraws as the user types (debounced ~300ms). With nothing to encode, the canvas shows an empty state and both downloads are locked; with content that cannot be represented in its format, the app says the content cannot be encoded — never "add some content" to a user who already has (see INV-3).

### APP-3: Styling surface

Foreground accepts a solid colour or a two-stop gradient (two linear directions or radial); background accepts a colour or transparent. Six dot styles, independent corner-square and corner-dot styles, and an optional centre logo. Colour combinations that measurably risk scan failure show a warning before export.

### APP-4: Exports are print-ready

PNG downloads at 2× resolution (560×560); SVG downloads resolution-independent. Both include the 4-module quiet zone painted in the background colour, so a file can be placed without adding margin.

### APP-5: Downloading saves to history

Every download stores the design (with a live thumbnail) in browser-local history. History entries offer restore, share-link copy, and delete; restore replaces the canvas and offers a take-back for what it replaced.

### APP-6: Clear-all arms inline and ignores the double-click

"Clear all" turns into an inline "Confirm?" that ignores clicks within the platform double-click threshold (see INV-12), and even a confirmed clear still offers the take-back.

### APP-7: Every destructive action is reversible from the tray

Delete, clear-all, restore, a share link landing in a loaded tab, and logo removal each push a take-back (see INV-13/INV-14): same-kind bursts coalesce into one offer ("3 designs deleted"), unrelated actions stack, a depth control reverses the n newest groups at once, and restored entries return to the position they held.

### APP-8: The tray is readable, holdable, and scoped

A take-back shows a draining time rule, a mono depth count, and the list of pending groups; pointer or focus over the tray holds every clock. `⌘Z`/`Esc` work only while an offer is open and never when focus is in a text field. An idle tray mounts no focusable controls.

### APP-9: The draft survives a reload

The design being edited persists per-tab across reload without requiring a download; a refused write is reported inline where the user acted (quota reads as an error, storage-switched-off as a warning — severity follows the cause), and the report is sticky until a write succeeds (see INV-7/INV-8).

### APP-10: Share links carry the whole design and nothing else

A share link encodes the design into the URL fragment (`#s=…`); nothing is stored server-side, logos are excluded, and query parameters on the link are preserved. Opening a link — cold or in a tab that already has the app — applies the design, strips the consumed hash, and offers a take-back for whatever it displaced.

### APP-11: Copying a link confirms without costing anything

Copying a share link shows a "Link copied" toast, and that message never consumes a pending take-back (see INV-13).

### APP-12: Logo intake is one path with one verdict

A logo arrives via the picker or by dropping a file anywhere on the canvas; both paths accept PNG/JPG under 2 MB, validate the bytes, and reject with the same inline message (see INV-6). Removing the logo offers a take-back.

### APP-13: Agent setup is one quiet trigger and a modal

At ≥640px the header shows an "Agent setup" button opening the app's only modal: per-agent install commands with one copy button per section, confirmation on the button itself, and an inline error on a refused copy. Escape closes the dialog without spending a pending take-back, and an open dialog holds the undo clock (see INV-14).

### APP-14: The workspace owns the first viewport

On load, the workspace fills the viewport exactly; the discovery notes (see SITE-2) begin below the fold and never appear uninvited. Mobile swaps the sidebar for a history drawer and a sticky export bar that respects the consent inset (see INV-11).
