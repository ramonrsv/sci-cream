export const STATE_VAL = 0;
export const STATE_SET = 1;

export function sleep_ms(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
