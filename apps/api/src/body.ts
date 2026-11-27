import { HttpError } from "./http";

// Request bodies are small JSON objects (only PATCH /v1/preferences has one).
const MAX_BODY_BYTES = 4 * 1024;

// Checks, in order: media type (415), size (413), valid JSON (400). The
// caller validates the shape with a schema.
export async function readJson(request: Request): Promise<unknown> {
  const mediaType = (request.headers.get("Content-Type") ?? "").split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    throw new HttpError(415, "unsupported_media_type", "Send the body as application/json.");
  }

  // Content-Length rejects a large body before reading it; measuring what was
  // read covers clients that don't send the header.
  const tooLarge = new HttpError(413, "payload_too_large", `Body must be at most ${MAX_BODY_BYTES} bytes.`);
  if (Number(request.headers.get("Content-Length")) > MAX_BODY_BYTES) throw tooLarge;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw tooLarge;

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_request", "Body is not valid JSON.");
  }
}
