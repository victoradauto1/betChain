import { LEGACY_BET_CUTOFF_ID } from "@/config/legacyBets";

export function isLegacyBet(betId) {
  return Number(betId) <= LEGACY_BET_CUTOFF_ID;
}
