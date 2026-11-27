import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./src/testing/server";

// A request with no matching handler fails the test instead of going out to
// the real network.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  // Vitest has no globals here, so Testing Library can't unmount by itself.
  cleanup();
  // Drop per-test overrides from server.use() so tests can't affect each other.
  server.resetHandlers();
  server.events.removeAllListeners();
});
afterAll(() => {
  server.close();
});
