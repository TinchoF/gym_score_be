/**
 * Modo Sede — offline sync service.
 *
 * See docs/MODO_SEDE.md for the full design. In short:
 *  - buildInstitutionBundle: dump everything scoped to one institution into a
 *    self-contained JSON so a laptop can serve it offline.
 *  - applyInstitutionSync: take the snapshot back from the laptop and upsert it
 *    into the cloud by _id. Inserts + updates are applied automatically; deletions
 *    are NOT applied, only reported for manual review. ScoringConfig is global and
 *    never synced back (read-only offline).
 *
 * The whole institution is locked online while it is in Modo Sede, so there is no
 * merge/conflict resolution here — a divergence guard just aborts if something in
 * the cloud was modified after the bundle was generated (only possible after a
 * forced unlock).
 */

import Institution from '../models/Institution';
import Tournament from '../models/Tournament';
import Gymnast from '../models/Gymnast';
import Judge from '../models/Judge';
import Score from '../models/Score';
import Rotation from '../models/Rotation';
import Admin from '../models/Admin';
import ScoringConfig from '../models/ScoringConfig';

export const BUNDLE_VERSION = 1;

// Collections that travel back from the laptop and get upserted into the cloud.
// Order matters only for readability. Admins / Institution / ScoringConfig are
// intentionally excluded from the write-back (see docs/MODO_SEDE.md).
const SYNCED_COLLECTIONS = ['tournaments', 'gymnasts', 'judges', 'scores', 'rotations'] as const;
type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

interface InstitutionBundle {
  meta: {
    bundleVersion: number;
    generatedAt: string;
    institutionId: string;
  };
  institution: any;
  tournaments: any[];
  gymnasts: any[];
  judges: any[];
  scores: any[];
  rotations: any[];
  admins: any[];
  scoringConfigs: any[];
}

export async function buildInstitutionBundle(institutionId: string): Promise<InstitutionBundle> {
  const institution = await Institution.findById(institutionId).lean();
  if (!institution) {
    throw new Error('Institución no encontrada');
  }

  const [tournaments, gymnasts, judges, scores, admins, scoringConfigs] = await Promise.all([
    Tournament.find({ institution: institutionId }).lean(),
    Gymnast.find({ institution: institutionId }).lean(),
    Judge.find({ institution: institutionId }).lean(),
    Score.find({ institution: institutionId }).lean(),
    Admin.find({ institution: institutionId }).lean(),
    ScoringConfig.find({}).lean(), // global collection — read-only reference
  ]);

  const tournamentIds = tournaments.map((t: any) => t._id);
  const rotations = await Rotation.find({ tournament: { $in: tournamentIds } }).lean();

  return {
    meta: {
      bundleVersion: BUNDLE_VERSION,
      generatedAt: new Date().toISOString(),
      institutionId: String(institutionId),
    },
    institution,
    tournaments,
    gymnasts,
    judges,
    scores,
    rotations,
    admins,
    scoringConfigs,
  };
}

export interface SyncPayload {
  meta?: { generatedAt?: string; institutionId?: string; deviceLabel?: string };
  tournaments?: any[];
  gymnasts?: any[];
  judges?: any[];
  scores?: any[];
  rotations?: any[];
}

export interface SyncResult {
  ok: boolean;
  divergence?: { collection: string; ids: string[] }[];
  applied?: Record<SyncedCollection, { upserted: number }>;
  toReview?: { deletions: Record<SyncedCollection, string[]> };
}

const MODEL_BY_COLLECTION: Record<SyncedCollection, any> = {
  tournaments: Tournament,
  gymnasts: Gymnast,
  judges: Judge,
  scores: Score,
  rotations: Rotation,
};

/** Fields we never want to blindly $set from the incoming snapshot. */
function sanitizeDoc(doc: any): { _id: any; body: Record<string, any> } {
  const { _id, __v, createdAt, updatedAt, ...body } = doc;
  return { _id, body };
}

/**
 * Apply the laptop snapshot for one institution.
 *
 * @param institutionId  the locked institution
 * @param payload        the snapshot from the offline server
 * @param opts.finalize  when true, clears the lock after a successful sync
 */
export async function applyInstitutionSync(
  institutionId: string,
  payload: SyncPayload,
  opts: { finalize?: boolean } = {},
): Promise<SyncResult> {
  const generatedAt = payload.meta?.generatedAt ? new Date(payload.meta.generatedAt) : null;
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) {
    throw new Error('payload.meta.generatedAt es requerido (timestamp del bundle original)');
  }

  const tournamentsIn = payload.tournaments ?? [];
  const cloudTournamentIds = (await Tournament.find({ institution: institutionId }).select('_id').lean()).map((t: any) =>
    String(t._id),
  );
  const allTournamentIds = Array.from(
    new Set([...cloudTournamentIds, ...tournamentsIn.map((t: any) => String(t._id))]),
  );

  const scopeFilter = (col: SyncedCollection): Record<string, any> =>
    col === 'rotations' ? { tournament: { $in: allTournamentIds } } : { institution: institutionId };

  // 1. Divergence guard — abort if the cloud changed after the bundle was generated.
  const divergence: { collection: string; ids: string[] }[] = [];
  for (const col of SYNCED_COLLECTIONS) {
    const model = MODEL_BY_COLLECTION[col];
    const changed = await model
      .find({ ...scopeFilter(col), updatedAt: { $gt: generatedAt } })
      .select('_id')
      .lean();
    if (changed.length) {
      divergence.push({ collection: col, ids: changed.map((d: any) => String(d._id)) });
    }
  }
  if (divergence.length) {
    return { ok: false, divergence };
  }

  // 2. Upsert inserts + updates. Idempotent; safe to re-run.
  const applied = {} as Record<SyncedCollection, { upserted: number }>;
  const deletions = {} as Record<SyncedCollection, string[]>;

  for (const col of SYNCED_COLLECTIONS) {
    const model = MODEL_BY_COLLECTION[col];
    const incoming = (payload[col] ?? []) as any[];
    const incomingIds = new Set(incoming.map((d) => String(d._id)));

    for (const doc of incoming) {
      const { _id, body } = sanitizeDoc(doc);
      await model.updateOne({ _id }, { $set: body }, { upsert: true });
    }
    applied[col] = { upserted: incoming.length };

    // 3. Deletions — report only, never applied automatically.
    const cloudDocs = await model.find(scopeFilter(col)).select('_id').lean();
    deletions[col] = cloudDocs
      .map((d: any) => String(d._id))
      .filter((id: string) => !incomingIds.has(id));
  }

  // 4. Update lock metadata.
  const lockUpdate: Record<string, any> = { 'offlineMode.lastSyncAt': new Date() };
  if (opts.finalize) {
    lockUpdate['offlineMode.active'] = false;
  }
  await Institution.updateOne({ _id: institutionId }, { $set: lockUpdate });

  return {
    ok: true,
    applied,
    toReview: { deletions },
  };
}
