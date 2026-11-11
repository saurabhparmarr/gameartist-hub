import "@testing-library/jest-dom/vitest";
import { TextDecoder, TextEncoder } from "util";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

Object.defineProperty(globalThis, "TextEncoder", {
  value: TextEncoder,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "TextDecoder", {
  value: TextDecoder,
  configurable: true,
  writable: true,
});
Object.defineProperty(globalThis, "Uint8Array", {
  value: Uint8Array,
  configurable: true,
  writable: true,
});

afterEach(() => {
  cleanup();
});
