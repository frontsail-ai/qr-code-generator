/* `URLSearchParams` is a WHATWG platform global — browsers, Node, Bun and
   workers all ship it — but it lives in TypeScript's DOM lib, which this
   package deliberately omits so that browser APIs stay a type error. Declaring
   the slice we actually use keeps the guardrail intact without reaching for
   `lib: DOM` (browser leakage) or `@types/node` (Node leakage). */
declare class URLSearchParams {
  set(name: string, value: string): void;
  toString(): string;
}
