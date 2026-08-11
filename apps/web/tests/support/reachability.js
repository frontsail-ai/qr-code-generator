import { expect } from "@playwright/test";

/* Is the thing actually on screen for the user?
 *
 * `toBeInViewport` compares a bounding box with the viewport rectangle. It is
 * blind to what is painted on top, so an element lying underneath a fixed
 * overlay measures as perfectly visible — which is how a storage warning parked
 * squarely behind the consent banner passed its own test (#61 follow-up), and
 * how the mobile export bar sat under the same banner before #59. Both were
 * found by hand with `elementFromPoint`, twice, because the technique lived in
 * a throwaway probe instead of here.
 *
 * Geometry is still worth asserting — it catches the element being off the
 * bottom of the page entirely — so this checks both, and reports which half
 * failed rather than leaving a bare boolean.
 */

/* Top and bottom rather than the centre alone: a strip covered by an overlay
   that reaches only part of the way up is still a strip the user cannot read,
   and the centre would call it fine. */
const PROBE_POINTS = [
  { label: "top", at: (box) => box.y + 6 },
  { label: "bottom", at: (box) => box.y + box.height - 6 },
];

/**
 * Asserts `locator` is inside the viewport *and* that the user's pointer would
 * land on it — not on something painted over it.
 */
export async function expectUnobstructed(page, locator, description) {
  const name = description ?? (await locator.evaluate((el) => el.tagName.toLowerCase()));

  await expect(locator, `${name} should be fully inside the viewport`).toBeInViewport({
    ratio: 1,
  });

  const box = await locator.boundingBox();
  const handle = await locator.elementHandle();

  for (const point of PROBE_POINTS) {
    const covering = await page.evaluate(
      ({ element, x, y }) => {
        const hit = document.elementFromPoint(x, y);
        if (!hit) return "nothing (outside the window)";
        if (hit === element || element.contains(hit) || hit.contains(element)) return null;
        /* Name it the way a person would recognise it: its own text if it has
           any, otherwise the nearest landmark it belongs to. */
        const landmark = hit.closest("[role], header, footer, aside, dialog");
        const text = (hit.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
        return text || landmark?.getAttribute("aria-label") || landmark?.tagName || hit.tagName;
      },
      { element: handle, x: box.x + box.width / 2, y: point.at(box) },
    );

    expect(covering, `${name} is covered at its ${point.label} by "${covering}"`).toBe(null);
  }
}
