import { connectLambda, getStore } from "@netlify/blobs";
import { createDeckService } from "../../server/decks-service.js";
export async function handler(event) {
  connectLambda(event);
  // The Lambda bridge in the SDK omits the platform's uncached endpoint.
  // Pass it explicitly: moderation and quota checks need immediate reads.
  const blobs = JSON.parse(Buffer.from(event.blobs, "base64").toString());
  const store = getStore({
    name: "community-decks-v1",
    consistency: "strong",
    uncachedEdgeURL: blobs.url_uncached,
  });
  const handle = createDeckService(store, {
    secret: process.env.DECK_SESSION_SECRET,
    setupHash: process.env.DECK_ADMIN_SETUP_HASH,
  });
  const headers = new Headers(event.headers);
  const host = headers.get("host") || "underdarkcards.csproject.org";
  const url =
    "https://" +
    host +
    "/.netlify/functions/decks" +
    (event.rawQuery
      ? "?" + event.rawQuery
      : new URLSearchParams(event.queryStringParameters || {}).size
        ? "?" + new URLSearchParams(event.queryStringParameters)
        : "");
  const request = new Request(url, {
    method: event.httpMethod,
    headers,
    ...(!["GET", "HEAD"].includes(event.httpMethod)
      ? {
          body: Buffer.from(
            event.body || "",
            event.isBase64Encoded ? "base64" : "utf8",
          ),
        }
      : {}),
  });
  const response = await handle(request, {
    ip:
      event.headers["x-nf-client-connection-ip"] ||
      event.headers["client-ip"] ||
      "unknown",
  });
  const type = response.headers.get("content-type") || "";
  const binary = type.startsWith("image/") || type === "application/pdf";
  const bytes = Buffer.from(await response.arrayBuffer());
  return {
    statusCode: response.status,
    headers: Object.fromEntries(response.headers),
    body: bytes.toString(binary ? "base64" : "utf8"),
    isBase64Encoded: binary,
  };
}
