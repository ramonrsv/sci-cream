import pino from "pino";

/**
 * Process-wide structured logger for server-side code.
 *
 * Emits one JSON line per event to stdout and owns no transport: the platform collects stdout.
 *
 * Transport-free by design: a transport buffers through a worker thread, and those writes can be
 * lost when a serverless instance freezes right after the response. The sync write is cheap: the
 * expense is formatting, and object fields let a below-threshold call return on a comparison.
 *
 * Server-only — Node's `stdout` does not exist in the browser. Client components keep `console`.
 */
export const log = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),

  // Replaces Pino's default `pid`/`hostname`, which say nothing useful about an ephemeral instance.
  base: { env: process.env.VERCEL_ENV ?? process.env.NODE_ENV },

  // Several actions take an email as an argument; keep addresses out of the log drain.
  redact: { paths: ["userEmail", "email", "*.email"], censor: "[redacted]" },
});
