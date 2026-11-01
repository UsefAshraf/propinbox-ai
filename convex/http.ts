import { httpRouter } from "convex/server";
import { ConvexError } from "convex/values";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const CHANNELS = ["email", "whatsapp", "phone"] as const;
type Channel = (typeof CHANNELS)[number];

function json(status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalString(value: unknown): value is string | undefined | null {
  return value === undefined || value === null || typeof value === "string";
}

const http = httpRouter();

http.route({
  path: "/webhooks/incoming-message",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.WEBHOOK_SECRET;
    if (secret && request.headers.get("x-webhook-secret") !== secret) {
      return json(401, { error: "Invalid or missing x-webhook-secret header." });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json(400, { error: "Request body must be valid JSON." });
    }
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return json(400, { error: "Request body must be a JSON object." });
    }
    const { channel, from, fromName, subject, body } = payload as Record<string, unknown>;

    if (typeof channel !== "string" || !CHANNELS.includes(channel as Channel)) {
      return json(400, { error: `"channel" must be one of: ${CHANNELS.join(", ")}.` });
    }
    if (!isNonEmptyString(from)) {
      return json(400, { error: '"from" must be a non-empty string.' });
    }
    if (!isNonEmptyString(body)) {
      return json(400, { error: '"body" must be a non-empty string.' });
    }
    if (!optionalString(fromName)) {
      return json(400, { error: '"fromName" must be a string if provided.' });
    }
    if (!optionalString(subject)) {
      return json(400, { error: '"subject" must be a string if provided.' });
    }

    try {
      const result = await ctx.runMutation(internal.ingest.receiveMessage, {
        channel: channel as Channel,
        from,
        body,
        ...(fromName ? { fromName } : {}),
        ...(subject ? { subject } : {}),
      });
      return json(200, result);
    } catch (err) {
      if (err instanceof ConvexError) {
        return json(400, { error: String(err.data) });
      }
      console.error("Failed to ingest webhook message", err);
      return json(500, { error: "Internal error while processing the message." });
    }
  }),
});

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => new Response("ok", { status: 200 })),
});

export default http;
