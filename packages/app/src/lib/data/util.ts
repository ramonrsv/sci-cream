/**
 * Shared internals for the server-action modules in this directory.
 *
 * Not a `"use server"` module: those may only export async functions, and marking this one would
 * publish its exports as endpoints a browser could call.
 */

/**
 * Utility class that tracks the number of database fetch calls, used for logging and debugging.
 *
 * Shared across the action modules so the count reads as one sequence per server, not one per
 * domain.
 *
 * @todo Remove or replace with a proper observability solution before production.
 */
export class FetchCounter {
  private static count = 0;

  /** Return the current call index and increment the counter */
  static async get() {
    return this.count++;
  }
}
