import type { Logger } from "pino";

import type { DataError } from "@/lib/result";

/** Binds an action's name to the logging it does, so the name is written once per action. */

/** One action's logging, with its name and the module's logger already bound. */
export type ActionContext = {
  /** Log at debug, merging the action's name into `ctx`. */
  debug: (ctx: Record<string, unknown>, message: string) => void;
  /** Log at warn, merging the action's name into `ctx`. */
  warn: (ctx: Record<string, unknown>, message: string) => void;
  /**
   * Log a refusal and return it, so a guard is one line where it stands.
   *
   * Every refusal is logged, the `Unauthenticated` included: the UI gates each action behind a
   * `signedIn`; reaching one anonymously means the gate failed or the endpoint was called direct.
   */
  refuse: <E>(
    error: DataError | E,
    ctx?: Record<string, unknown>,
  ) => { ok: false; error: DataError | E };
};

/**
 * Build a module's `action` factory over its child logger.
 *
 * Each `lib/data` module holds one of these, and every action opens by naming itself to it:
 * `const act = action("createUserRecipe", { recipeName });`. That call logs the action's start,
 * so a start line cannot be forgotten, and `act` carries the name into everything logged after.
 */
export function makeAction(
  log: Logger,
): (name: string, ctx?: Record<string, unknown>) => ActionContext {
  return (name, startCtx = {}) => {
    const bind = (ctx: Record<string, unknown>) => ({ action: name, ...ctx });

    log.debug(bind(startCtx), "start");

    return {
      debug: (ctx, message) => log.debug(bind(ctx), message),
      warn: (ctx, message) => log.warn(bind(ctx), message),
      refuse: (error, ctx = {}) => {
        log.warn(bind({ error, ...ctx }), "refused");
        return { ok: false, error };
      },
    };
  };
}
