/**
 * Shared helpers for keeping Gymnast.level (and Gymnast.apparatusLevels[].level)
 * in sync with ScoringConfig.level — used by the config rename/delete cascade
 * (configRoutes.ts) and by the one-time reconciliation script
 * (scripts/reconcile-orphaned-levels.ts).
 */

import Gymnast from '../models/Gymnast';

const CONFIG_GENDER_TO_GYMNAST_CODE: Record<string, string> = {
  GAM: 'M',
  GAF: 'F',
};

/** ['GAM','GAF'] -> ['M','F'] (Gymnast.gender codes matching a ScoringConfig's gender array) */
export function mapConfigGendersToGymnastCodes(configGenders: string[] | undefined): string[] {
  return (configGenders || [])
    .map((g) => CONFIG_GENDER_TO_GYMNAST_CODE[g])
    .filter((code): code is string => Boolean(code));
}

export interface CascadeResult {
  gymnastsUpdated: number;
  apparatusLevelEntriesUpdated: number;
}

/**
 * Repoints every Gymnast currently on `oldLevel` (for the given config genders)
 * to `newLevel`, covering both the top-level `level` field and the per-apparatus
 * `apparatusLevels` overrides (GAM only). Used both when renaming a config in place
 * and when reassigning gymnasts away from a config that's about to be deleted.
 */
export async function cascadeLevelRename(
  oldLevel: string,
  newLevel: string,
  configGenders: string[] | undefined
): Promise<CascadeResult> {
  const gymnastGenders = mapConfigGendersToGymnastCodes(configGenders);
  if (!oldLevel || !newLevel || oldLevel === newLevel || gymnastGenders.length === 0) {
    return { gymnastsUpdated: 0, apparatusLevelEntriesUpdated: 0 };
  }

  const levelResult = await Gymnast.updateMany(
    { level: oldLevel, gender: { $in: gymnastGenders } },
    { $set: { level: newLevel } }
  );

  let apparatusLevelEntriesUpdated = 0;
  if (gymnastGenders.includes('M')) {
    const apparatusResult = await Gymnast.updateMany(
      { 'apparatusLevels.level': oldLevel, gender: 'M' },
      { $set: { 'apparatusLevels.$[elem].level': newLevel } },
      { arrayFilters: [{ 'elem.level': oldLevel }] }
    );
    apparatusLevelEntriesUpdated = apparatusResult.modifiedCount || 0;
  }

  return {
    gymnastsUpdated: levelResult.modifiedCount || 0,
    apparatusLevelEntriesUpdated,
  };
}

/** Counts (without writing) how many gymnasts/apparatusLevels entries currently use `level` for the given config genders. */
export async function countGymnastsOnLevel(
  level: string,
  configGenders: string[] | undefined
): Promise<{ gymnastCount: number; apparatusLevelEntryCount: number }> {
  const gymnastGenders = mapConfigGendersToGymnastCodes(configGenders);
  if (gymnastGenders.length === 0) {
    return { gymnastCount: 0, apparatusLevelEntryCount: 0 };
  }

  const gymnastCount = await Gymnast.countDocuments({ level, gender: { $in: gymnastGenders } });

  let apparatusLevelEntryCount = 0;
  if (gymnastGenders.includes('M')) {
    apparatusLevelEntryCount = await Gymnast.countDocuments({
      'apparatusLevels.level': level,
      gender: 'M',
    });
  }

  return { gymnastCount, apparatusLevelEntryCount };
}

/** Lightweight list (for 409 payloads / admin review) of gymnasts currently on `level`. */
export async function listGymnastsOnLevel(level: string, configGenders: string[] | undefined) {
  const gymnastGenders = mapConfigGendersToGymnastCodes(configGenders);
  if (gymnastGenders.length === 0) return [];
  return Gymnast.find({ level, gender: { $in: gymnastGenders } })
    .select('_id name birthDate institution')
    .lean();
}

// ---------------------------------------------------------------------------
// Generic string similarity (no level-name-specific hardcoding — works for any
// naming convention a super-admin might choose). Used only by the one-time
// reconciliation script to suggest a likely target for an orphaned level name.
// ---------------------------------------------------------------------------

function normalizeLevelString(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]/g, ''); // strip spaces/punctuation
}

function bigrams(s: string): string[] {
  if (s.length < 2) return [s];
  const result: string[] = [];
  for (let i = 0; i < s.length - 1; i++) {
    result.push(s.slice(i, i + 2));
  }
  return result;
}

/** Sørensen–Dice coefficient over character bigrams of the normalized strings, in [0, 1]. */
export function levelNameSimilarity(a: string, b: string): number {
  const na = normalizeLevelString(a);
  const nb = normalizeLevelString(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const bigramsA = bigrams(na);
  const bigramsB = bigrams(nb);

  const counts = new Map<string, number>();
  for (const bg of bigramsA) counts.set(bg, (counts.get(bg) || 0) + 1);

  let matches = 0;
  for (const bg of bigramsB) {
    const remaining = counts.get(bg) || 0;
    if (remaining > 0) {
      matches++;
      counts.set(bg, remaining - 1);
    }
  }

  return (2 * matches) / (bigramsA.length + bigramsB.length);
}

export interface LevelSuggestion {
  level: string;
  score: number;
}

/** Best-matching candidate level (by generic name similarity) among `candidateLevels`, or null if none. */
export function suggestClosestLevel(
  orphanedLevel: string,
  candidateLevels: string[]
): LevelSuggestion | null {
  let best: LevelSuggestion | null = null;
  for (const candidate of candidateLevels) {
    const score = levelNameSimilarity(orphanedLevel, candidate);
    if (!best || score > best.score) {
      best = { level: candidate, score };
    }
  }
  return best;
}
