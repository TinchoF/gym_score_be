/**
 * Script de uso puntual: recorre TODOS los gimnastas de TODAS las instituciones
 * buscando niveles huérfanos (que no matchean ninguna ScoringConfig activa
 * compatible en género) y sugiere el nombre de nivel activo más parecido.
 *
 * Por defecto corre en modo dry-run (solo imprime/exporta el reporte, no
 * escribe nada). Con --apply, reasigna cada gimnasta huérfano al nivel
 * sugerido (mismo mecanismo que el cascade de renombrado de ScoringConfig)
 * y deja registro en AuditLog.
 *
 * Uso:
 *   npx ts-node scripts/reconcile-orphaned-levels.ts                 # dry-run, reporte en consola
 *   npx ts-node scripts/reconcile-orphaned-levels.ts --out=report.json  # dry-run, además exporta JSON
 *   npx ts-node scripts/reconcile-orphaned-levels.ts --apply --admin=<adminObjectId>  # aplica los cambios
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import Gymnast from '../src/models/Gymnast';
import ScoringConfig from '../src/models/ScoringConfig';
import { logAudit } from '../src/utils/auditLogger';
import {
  cascadeLevelRename,
  mapConfigGendersToGymnastCodes,
  suggestClosestLevel,
} from '../src/utils/levelReconciliation';

dotenv.config();

interface ReportRow {
  gymnastId: string;
  gymnastName: string;
  institutionId: string;
  gender: string; // 'M' | 'F'
  currentLevel: string;
  suggestedLevel: string | null;
  similarityScore: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const adminArg = args.find((a) => a.startsWith('--admin='));
  const outArg = args.find((a) => a.startsWith('--out='));
  return {
    apply,
    adminId: adminArg ? adminArg.split('=')[1] : undefined,
    outPath: outArg ? outArg.split('=')[1] : undefined,
  };
}

async function main() {
  const { apply, adminId, outPath } = parseArgs();

  if (!process.env.MONGO_URI) {
    console.error('CRITICAL: MONGO_URI no está definido (revisá tu .env).');
    process.exit(1);
  }

  if (apply && !adminId) {
    console.error('--apply requiere --admin=<adminObjectId> para dejar registro de auditoría de quién corrió la reconciliación.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Conectado a MongoDB.\n');

  try {
    const configs = await ScoringConfig.find({ active: true }).lean();
    const allGymnasts = await Gymnast.find({}).lean();

    // Config candidata por género de gimnasta ('M'/'F'), con su nombre de nivel
    const candidateLevelsByGymnastGender: Record<string, string[]> = { M: [], F: [] };
    for (const config of configs) {
      const gymnastGenders = mapConfigGendersToGymnastCodes(config.gender as any);
      for (const code of gymnastGenders) {
        candidateLevelsByGymnastGender[code].push(config.level);
      }
    }

    const report: ReportRow[] = [];

    for (const gymnast of allGymnasts) {
      const hasConfig = configs.some(
        (c: any) => c.level === gymnast.level && mapConfigGendersToGymnastCodes(c.gender).includes(gymnast.gender as any)
      );
      if (hasConfig) continue; // no está huérfano

      const candidates = candidateLevelsByGymnastGender[gymnast.gender as string] || [];
      const suggestion = suggestClosestLevel(gymnast.level as string, candidates);

      report.push({
        gymnastId: String(gymnast._id),
        gymnastName: gymnast.name as string,
        institutionId: String(gymnast.institution),
        gender: gymnast.gender as string,
        currentLevel: gymnast.level as string,
        suggestedLevel: suggestion?.level ?? null,
        similarityScore: suggestion ? Number(suggestion.score.toFixed(2)) : 0,
      });
    }

    console.log(`Gimnastas huérfanos encontrados: ${report.length}\n`);
    console.table(
      report.map((r) => ({
        Gimnasta: r.gymnastName,
        Institución: r.institutionId,
        Género: r.gender,
        'Nivel actual': r.currentLevel,
        Sugerencia: r.suggestedLevel ?? '(sin candidato)',
        Similitud: r.similarityScore,
      }))
    );

    if (outPath) {
      fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
      console.log(`\nReporte exportado a ${outPath}`);
    }

    if (!apply) {
      console.log('\nModo dry-run: no se escribió nada. Corré con --apply --admin=<adminObjectId> para aplicar las sugerencias.');
      return;
    }

    console.log('\nAplicando sugerencias...\n');
    let applied = 0;
    let skipped = 0;
    for (const row of report) {
      if (!row.suggestedLevel) {
        console.log(`  [omitido] ${row.gymnastName}: sin candidato para "${row.currentLevel}" (${row.gender})`);
        skipped++;
        continue;
      }

      const gymnastGenderConfigCode = row.gender === 'M' ? 'GAM' : 'GAF';
      await cascadeLevelRename(row.currentLevel, row.suggestedLevel, [gymnastGenderConfigCode]);

      await logAudit({
        action: 'UPDATE',
        entityType: 'gymnast',
        entityId: row.gymnastId,
        performedBy: adminId!,
        performedByRole: 'super-admin',
        institution: row.institutionId,
        details: {
          action: 'reconcile_orphaned_level_script',
          oldLevel: row.currentLevel,
          newLevel: row.suggestedLevel,
          similarityScore: row.similarityScore,
        },
      });

      console.log(`  [ok] ${row.gymnastName}: "${row.currentLevel}" -> "${row.suggestedLevel}" (similitud ${row.similarityScore})`);
      applied++;
    }

    console.log(`\nListo. Aplicados: ${applied}. Omitidos (sin candidato): ${skipped}.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('Error corriendo la reconciliación:', error);
  process.exit(1);
});
