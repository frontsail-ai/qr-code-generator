/* Module Q — the app mark: a letter Q assembled from QR modules with a
   cut-red tail. From the Plico logo concepts (Logo.dc.html, mark 1C).
   Kept in sync with public/favicon.svg. */

const MODULES: [number, number][] = [
  [4, 4],
  [15, 4],
  [26, 4],
  [4, 15],
  [26, 15],
  [4, 26],
  [15, 26],
  [26, 26],
];

interface LogoProps {
  size?: number;
}

export function Logo({ size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="QR Code Generator logo"
    >
      {MODULES.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={9} height={9} fill="var(--ink-900)" />
      ))}
      <rect x={34} y={34} width={10} height={10} fill="var(--cut-500)" />
    </svg>
  );
}
