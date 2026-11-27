// Placeholder until the routes land: every request is an unknown route.
// The error shape matches the contract (docs/watchlist-api.md#errors).
export default {
  async fetch(): Promise<Response> {
    return Response.json(
      { error: { code: "not_found", message: "Unknown route." } },
      { status: 404, headers: { "Cache-Control": "no-store" } },
    );
  },
} satisfies ExportedHandler<Env>;
