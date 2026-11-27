import { createHandlers } from "@crypto-markets/api/testing";
import { setupServer } from "msw/node";

// A mock API proxy for this app's tests, built from the shared handlers.
// Started in vitest.setup.ts; override a route in a test with server.use().
export const server = setupServer(...createHandlers());
