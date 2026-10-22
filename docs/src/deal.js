/** Frame-verified approximation of the Daily SET opening: ~255 ms/card. */
export const DEAL_STEP_MS = 255;
export const DEAL_FLIGHT_MS = 300;
export const DEAL_SETTLE_MS = 180;
export const DEAL_CARD_COUNT = 12;
/** Wait until the last card has landed, plus a short visual settling beat. */
export const DEAL_DURATION_MS =
  (DEAL_CARD_COUNT - 1) * DEAL_STEP_MS + DEAL_FLIGHT_MS + DEAL_SETTLE_MS;
