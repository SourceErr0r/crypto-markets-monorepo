import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./src/testing/server";

// A request with no matching handler fails the test instead of going out to
// the real network.
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
// Drop per-test overrides from server.use() so tests can't affect each other.
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});
