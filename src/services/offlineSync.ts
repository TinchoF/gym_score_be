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

import { EJSON } from 'bson';
import Institution from '../models/Institution';
import Tournament from '../models/Tournament';
import Gymnast from '../models/Gymnast';
import Judge from '../models/Judge';
import Score from '../models/Score';
import Rotation from '../models/Rotation';
import Admin from '../models/Admin';
import ScoringConfig from '../models/ScoringConfig';

export const BUNDLE_VERSION = 1;

/**
 * El bundle / snapshot viaja como Extended JSON (bson): preserva ObjectId y Date
 * exactos a través de un `JSON.stringify`/`parse`. Así el import es un espejo
 * byte-exacto de la nube (sin re-castear, sin re-validar, sin defaults de Mongoose)
 * y el diff no tiene falsos positivos por diferencias de tipo. Las rutas serializan
 * al salir y deserializan al entrar; el servicio trabaja siempre con tipos BSON.
 */
export const toTransport = (obj: any) => EJSON.serialize(obj, { relaxed: true });
export const fromTransport = (obj: any) => EJSON.deserialize(obj, { relaxed: true });

// Collections that travel back from the laptop and get upserted into the cloud.
// Order matters only for readability. Admins / Institution / ScoringConfig are
// intentionally excluded from the write-back (see docs/MODO_SEDE.md).
export const SYNCED_COLLECTIONS = ['tournaments', 'gymnasts', 'judges', 'scores', 'rotations'] as const;
type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

export interface InstitutionBundle {
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

export interface ConflictEntry {
  collection: SyncedCollection;
  _id: string;
  label: string;
  changedFields: string[];
  cloud: Record<string, any>;
  local: Record<string, any> | null;
}

/**
 * - undefined  → abortar y devolver los conflictos
 * - 'overwrite'  → la sede gana: pisar la nube también en los docs en conflicto
 * - 'keepCloud'  → la nube gana en los docs en conflicto: sincronizar todo lo demás
 */
export type ConflictResolution = 'overwrite' | 'keepCloud';

export interface DocRef {
  _id: string;
  label: string;
  changedFields?: string[];
}

export interface CollectionChanges {
  created: DocRef[];
  updated: DocRef[];
  unchanged: number;
  deleted: DocRef[]; // en la nube, no en el snapshot local — NO se borran, solo se reportan
}

export interface SyncResult {
  ok: boolean;
  dryRun?: boolean;
  conflicts?: ConflictEntry[];
  resolution?: ConflictResolution;
  keptCloud?: ConflictEntry[];
  /** Diff real: qué se creó / actualizó / quedó igual, por colección. */
  changes?: Record<SyncedCollection, CollectionChanges>;
  /** true si no se creó, actualizó ni hay bajas pendientes en ninguna colección. */
  upToDate?: boolean;
  toReview?: { deletions: Record<SyncedCollection, string[]> };
}

const IGNORE_FIELDS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'institution']);

function labelFor(col: SyncedCollection, doc: any): string {
  if (!doc) return '(borrado localmente)';
  if (col === 'scores') return `Puntaje · ${doc.apparatus ?? '?'}`;
  if (col === 'rotations') return `Rotación · ${doc.apparatus ?? '?'} #${doc.order ?? '?'}`;
  return doc.name ?? String(doc._id);
}

/** Serializa igual que un round-trip JSON: Date→ISO, ObjectId→hex, borra undefined. */
function normalize(v: any): any {
  return v === undefined ? null : JSON.parse(JSON.stringify(v));
}

/** Stringify canónico: ordena las claves recursivamente (insensible al orden). */
function canonical(v: any): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}

const isEmptyish = (v: any) =>
  v === null ||
  v === undefined ||
  v === '' ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

/** true si el valor de un campo es "el mismo" a efectos de sincronización. */
function fieldEqual(a: any, b: any): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (canonical(na) === canonical(nb)) return true;
  // ausente ≈ vacío: un default que Mongoose materializó de un lado no es un cambio real.
  return isEmptyish(na) && isEmptyish(nb);
}

/**
 * Campos que cambiarían en la nube si escribiéramos el doc local encima.
 * Compara ambos lados normalizados (Date/ObjectId/orden de claves) y tratando
 * "ausente ≈ vacío", así un round-trip JSON o un default de Mongoose no cuentan.
 */
function diffFields(cloudDoc: any, localDoc: any): string[] {
  if (!localDoc) {
    return Object.keys(cloudDoc || {}).filter((k) => !IGNORE_FIELDS.has(k));
  }
  const keys = new Set([...Object.keys(cloudDoc || {}), ...Object.keys(localDoc)]);
  const changed: string[] = [];
  for (const k of keys) {
    if (IGNORE_FIELDS.has(k)) continue;
    if (!fieldEqual(cloudDoc?.[k], localDoc[k])) changed.push(k);
  }
  return changed;
}

function pick(doc: any, fields: string[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) out[f] = doc ? doc[f] : undefined;
  return out;
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
  opts: { finalize?: boolean; conflictResolution?: ConflictResolution; dryRun?: boolean } = {},
): Promise<SyncResult> {
  const generatedAt = payload.meta?.generatedAt ? new Date(payload.meta.generatedAt) : null;
  if (!generatedAt || Number.isNaN(generatedAt.getTime())) {
    throw new Error('payload.meta.generatedAt es requerido (timestamp del bundle original)');
  }

  // Línea base para la guarda de divergencia: si ya hubo una sincronización previa,
  // sus propios upserts dejaron `updatedAt` en todos los docs → hay que comparar
  // contra ESA sincronización, no contra el bundle original. Si no, todo aparecería
  // como divergencia en la segunda sync (bug real 2026-08-31).
  const instDoc = await Institution.findById(institutionId).select('offlineMode').lean();
  const lastSyncAt: Date | undefined = (instDoc as any)?.offlineMode?.lastSyncAt;
  const baseline = lastSyncAt && lastSyncAt > generatedAt ? lastSyncAt : generatedAt;

  const tournamentsIn = payload.tournaments ?? [];
  const cloudTournamentIds = (await Tournament.find({ institution: institutionId }).select('_id').lean()).map((t: any) =>
    String(t._id),
  );
  const allTournamentIds = Array.from(
    new Set([...cloudTournamentIds, ...tournamentsIn.map((t: any) => String(t._id))]),
  );

  const scopeFilter = (col: SyncedCollection): Record<string, any> =>
    col === 'rotations' ? { tournament: { $in: allTournamentIds } } : { institution: institutionId };

  // Cargamos los docs de la nube una sola vez por colección y de ahí sacamos todo:
  // conflictos, diff real (creado/actualizado/igual) y bajas.
  const cloudByCol = new Map<SyncedCollection, Map<string, any>>();
  for (const col of SYNCED_COLLECTIONS) {
    const docs = await MODEL_BY_COLLECTION[col].find(scopeFilter(col)).lean();
    cloudByCol.set(col, new Map(docs.map((d: any) => [String(d._id), d])));
  }

  // 1. Conflictos: doc de la nube con updatedAt posterior a la línea base Y contenido distinto.
  const conflicts: ConflictEntry[] = [];
  for (const col of SYNCED_COLLECTIONS) {
    const localById = new Map(((payload[col] ?? []) as any[]).map((d) => [String(d._id), d]));
    for (const [id, cloudDoc] of cloudByCol.get(col)!) {
      if (!(cloudDoc.updatedAt && new Date(cloudDoc.updatedAt) > baseline)) continue;
      const localDoc = localById.get(id) ?? null;
      const fields = diffFields(cloudDoc, localDoc);
      if (!fields.length) continue; // updatedAt se movió pero el contenido es igual → no es conflicto
      conflicts.push({
        collection: col,
        _id: id,
        label: labelFor(col, localDoc ?? cloudDoc),
        changedFields: fields,
        cloud: pick(cloudDoc, fields),
        local: localDoc ? pick(localDoc, fields) : null,
      });
    }
  }

  // Sin resolución elegida → abortar y que el usuario decida (en dry-run seguimos:
  // es solo un preview, devolvemos los conflictos junto con el diff).
  if (conflicts.length && !opts.conflictResolution && !opts.dryRun) {
    return { ok: false, conflicts };
  }

  // 'keepCloud': no tocar los docs en conflicto; sincronizar todo lo demás.
  const keepCloudIds =
    opts.conflictResolution === 'keepCloud'
      ? new Set(conflicts.map((c) => `${c.collection}:${c._id}`))
      : new Set<string>();

  // 2. Diff real + upsert de lo que cambió.
  const changes = {} as Record<SyncedCollection, CollectionChanges>;
  const deletions = {} as Record<SyncedCollection, string[]>;

  for (const col of SYNCED_COLLECTIONS) {
    const model = MODEL_BY_COLLECTION[col];
    const incoming = (payload[col] ?? []) as any[];
    const incomingIds = new Set(incoming.map((d) => String(d._id)));
    const cloudById = cloudByCol.get(col)!;

    const created: DocRef[] = [];
    const updated: DocRef[] = [];
    let unchanged = 0;
    const ops: any[] = [];

    for (const localDoc of incoming) {
      const id = String(localDoc._id);
      if (keepCloudIds.has(`${col}:${id}`)) { unchanged++; continue; }
      const cloudDoc = cloudById.get(id);
      const { _id, body } = sanitizeDoc(localDoc);
      if (!cloudDoc) {
        created.push({ _id: id, label: labelFor(col, localDoc) });
        ops.push({ updateOne: { filter: { _id }, update: { $set: body }, upsert: true } });
      } else {
        const fields = diffFields(cloudDoc, localDoc);
        if (fields.length) {
          updated.push({ _id: id, label: labelFor(col, localDoc), changedFields: fields });
          ops.push({ updateOne: { filter: { _id }, update: { $set: body } } });
        } else {
          unchanged++;
        }
      }
    }

    // Un solo bulkWrite con SOLO lo que cambió (evita mover updatedAt en docs iguales
    // y el timeout de 30s de Heroku en torneos con miles de scores).
    if (ops.length && !opts.dryRun) await model.bulkWrite(ops, { ordered: false });

    // 3. Bajas — solo se reportan, nunca se aplican.
    const deleted: DocRef[] = [...cloudById.keys()]
      .filter((id) => !incomingIds.has(id))
      .map((id) => ({ _id: id, label: labelFor(col, cloudById.get(id)) }));
    deletions[col] = deleted.map((d) => d._id);

    changes[col] = { created, updated, unchanged, deleted };
  }

  const upToDate = SYNCED_COLLECTIONS.every(
    (col) => !changes[col].created.length && !changes[col].updated.length && !changes[col].deleted.length,
  );

  // 4. Update lock metadata (salvo dry-run).
  if (!opts.dryRun) {
    const lockUpdate: Record<string, any> = { 'offlineMode.lastSyncAt': new Date() };
    if (opts.finalize) lockUpdate['offlineMode.active'] = false;
    await Institution.updateOne({ _id: institutionId }, { $set: lockUpdate });
  }

  return {
    ok: true,
    dryRun: opts.dryRun || undefined,
    changes,
    upToDate,
    toReview: { deletions },
    ...(conflicts.length && !opts.conflictResolution ? { conflicts } : {}),
    ...(opts.conflictResolution ? { resolution: opts.conflictResolution } : {}),
    ...(keepCloudIds.size ? { keptCloud: conflicts } : {}),
  };
}

// ---------------------------------------------------------------------------
// LOCAL side (runs inside OFFLINE_MODE on the laptop) — load a bundle into the
// local DB, and dump the current local state as a sync payload.
// ---------------------------------------------------------------------------

/** Wipe this institution's data locally and load the bundle. Destructive by design. */
export async function importBundleToLocal(bundle: InstitutionBundle): Promise<{ institutionId: string; counts: Record<string, number> }> {
  const institutionId = bundle.meta.institutionId;
  const tournamentIds = (bundle.tournaments ?? []).map((t: any) => t._id);

  // Replace institution-scoped collections wholesale.
  await Promise.all([
    Tournament.deleteMany({ institution: institutionId }),
    Gymnast.deleteMany({ institution: institutionId }),
    Judge.deleteMany({ institution: institutionId }),
    Score.deleteMany({ institution: institutionId }),
    Rotation.deleteMany({ tournament: { $in: tournamentIds } }),
    Admin.deleteMany({ institution: institutionId }),
  ]);

  // Insert crudo por el driver: sin validación, sin defaults, tipos exactos (el
  // bundle ya viene con ObjectId/Date reales gracias a Extended JSON). El local es
  // un espejo de la nube; si la nube lo aceptó, acá entra igual.
  const rawInsert = async (model: any, docs: any[]) => {
    if (!docs?.length) return 0;
    try {
      const res = await model.collection.insertMany(docs, { ordered: false });
      return res.insertedCount ?? docs.length;
    } catch (err: any) {
      // ordered:false → inserta lo que puede; logueamos lo que falló
      const inserted = err?.result?.insertedCount ?? err?.insertedCount ?? 0;
      console.error(`[import] ${model.modelName}: ${docs.length - inserted}/${docs.length} fallaron`, err?.message);
      return inserted;
    }
  };

  const counts: Record<string, number> = {
    tournaments: await rawInsert(Tournament, bundle.tournaments),
    gymnasts: await rawInsert(Gymnast, bundle.gymnasts),
    judges: await rawInsert(Judge, bundle.judges),
    scores: await rawInsert(Score, bundle.scores),
    rotations: await rawInsert(Rotation, bundle.rotations),
    admins: await rawInsert(Admin, bundle.admins),
  };

  // ScoringConfig is global/read-only — refresh the local copy.
  await ScoringConfig.deleteMany({});
  counts.scoringConfigs = await rawInsert(ScoringConfig, bundle.scoringConfigs);

  // Upsert the institution doc and record the bundle baseline for the divergence guard.
  const { offlineMode: _drop, ...instBody } = sanitizeDoc(bundle.institution).body;
  await Institution.updateOne(
    { _id: institutionId },
    {
      $set: {
        ...instBody,
        offlineMode: {
          ...(bundle.institution?.offlineMode ?? {}),
          active: true,
          bundleGeneratedAt: new Date(bundle.meta.generatedAt),
        },
      },
    },
    { upsert: true },
  );

  return { institutionId, counts };
}

/** Dump the local institution state as a payload ready for POST .../sync. */
export async function exportLocalSnapshot(institutionId: string): Promise<SyncPayload & { meta: { generatedAt: string; institutionId: string } }> {
  const institution = await Institution.findById(institutionId).select('offlineMode').lean();
  const generatedAt =
    (institution as any)?.offlineMode?.bundleGeneratedAt?.toISOString?.() ??
    new Date(0).toISOString();

  const tournaments = await Tournament.find({ institution: institutionId }).lean();
  const tournamentIds = tournaments.map((t: any) => t._id);
  const [gymnasts, judges, scores, rotations] = await Promise.all([
    Gymnast.find({ institution: institutionId }).lean(),
    Judge.find({ institution: institutionId }).lean(),
    Score.find({ institution: institutionId }).lean(),
    Rotation.find({ tournament: { $in: tournamentIds } }).lean(),
  ]);

  return {
    meta: { generatedAt, institutionId: String(institutionId) },
    tournaments,
    gymnasts,
    judges,
    scores,
    rotations,
  };
}
