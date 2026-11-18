import { setupServer } from "msw/node";

import { createHandlers } from "./handlers";

// One mock proxy for this package's tests, started in vitest.setup.ts.
// Kept out of ./index.ts because msw/node only runs in Node, not in a browser.
export const server = setupServer(...createHandlers());
