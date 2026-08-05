import express from 'express';
import Config from '../models/Config';
import ScoringConfig from '../models/ScoringConfig';
import Gymnast from '../models/Gymnast';
import { logAudit } from '../utils/auditLogger';
import {
  cascadeLevelRename,
  countGymnastsOnLevel,
  listGymnastsOnLevel,
  mapConfigGendersToGymnastCodes,
} from '../utils/levelReconciliation';

const router = express.Router();

// ============================================
// Legacy Config Routes (Empty model)
// ============================================

// Obtener configuración actual
router.get('/', async (req, res) => {
  try {
    const config = await Config.findOne();
    if (!config) {
      const newConfig = new Config({});
      await newConfig.save();
      return res.json(newConfig);
    }
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ message: 'Error fetching config' });
  }
});

// Actualizar configuración
router.put('/', async (req, res) => {
  try {
    const config = await Config.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true }
    );
    res.json(config);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ message: 'Error updating config' });
  }
});

// ============================================
// Scoring Configuration Routes (MongoDB)
// ============================================

/**
 * GET /api/config/scoring
 * Returns all active scoring configurations
 */
router.get('/scoring', async (req, res) => {
  try {
    const configs = await ScoringConfig.find({ active: true }).sort({ level: 1 }).lean();

    // Cantidad de gimnastas (y de entradas apparatusLevels) que usan cada nivel,
    // para que la UI pueda bloquear el borrado proactivamente sin depender de
    // que el DELETE falle. Una sola agregación en vez de N+1 por config.
    const [levelCounts, apparatusLevelCounts] = await Promise.all([
      Gymnast.aggregate([
        { $group: { _id: { level: '$level', gender: '$gender' }, count: { $sum: 1 } } },
      ]),
      Gymnast.aggregate([
        { $match: { gender: 'M', apparatusLevels: { $exists: true, $ne: [] } } },
        { $unwind: '$apparatusLevels' },
        { $group: { _id: '$apparatusLevels.level', count: { $sum: 1 } } },
      ]),
    ]);

    const levelCountMap = new Map<string, number>(); // key: `${level}|${gymnastGenderCode}`
    for (const row of levelCounts) {
      levelCountMap.set(`${row._id.level}|${row._id.gender}`, row.count);
    }
    const apparatusLevelCountMap = new Map<string, number>(); // key: level (GAM only)
    for (const row of apparatusLevelCounts) {
      apparatusLevelCountMap.set(row._id, row.count);
    }

    const configsWithCounts = configs.map((config: any) => {
      const gymnastGenders = mapConfigGendersToGymnastCodes(config.gender);
      const gymnastCount = gymnastGenders.reduce(
        (sum, code) => sum + (levelCountMap.get(`${config.level}|${code}`) || 0),
        0
      );
      const apparatusLevelEntryCount = gymnastGenders.includes('M')
        ? apparatusLevelCountMap.get(config.level) || 0
        : 0;
      return { ...config, gymnastCount, apparatusLevelEntryCount };
    });

    res.json(configsWithCounts);
  } catch (error) {
    console.error('Error fetching scoring configs:', error);
    res.status(500).json({ error: 'Failed to fetch scoring configurations' });
  }
});

/**
 * GET /api/config/scoring/:level
 * Returns scoring configuration for a specific level
 */
router.get('/scoring/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const config = await ScoringConfig.findOne({ level, active: true });
    
    if (!config) {
      // Return default config if level not found
      return res.json({
        level,
        scoringMethod: 'deductions',
        baseStartValue: 10,
        hasBonuses: false,
        description: 'Default configuration'
      });
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error fetching scoring config for level:', error);
    res.status(500).json({ error: 'Failed to fetch scoring configuration' });
  }
});

/**
 * POST /api/config/scoring
 * Create a new scoring configuration
 * Requires super-admin role
 */
router.post('/scoring', async (req, res) => {
  try {
    // TODO: Add super-admin check middleware
    const { level, scoringMethod, baseStartValue, hasBonuses, editableStartValue, hasNeutralDeductions, description, gender, allowedApparatuses } = req.body;

    const newConfig = new ScoringConfig({
      level,
      scoringMethod,
      baseStartValue,
      hasBonuses,
      editableStartValue: editableStartValue || false,
      hasNeutralDeductions: hasNeutralDeductions || false,
      description,
      gender: gender || ['GAM', 'GAF'],
      allowedApparatuses: allowedApparatuses || [],
      active: true
    });
    
    await newConfig.save();
    res.status(201).json(newConfig);
  } catch (error) {
    console.error('Error creating scoring config:', error);
    res.status(500).json({ error: 'Failed to create scoring configuration' });
  }
});

/**
 * PUT /api/config/scoring/:id
 * Update an existing scoring configuration
 * Requires super-admin role
 */
router.put('/scoring/:id', async (req, res) => {
  try {
    // TODO: Add super-admin check middleware
    const { id } = req.params;
    const { level, scoringMethod, baseStartValue, hasBonuses, editableStartValue, hasNeutralDeductions, description, gender, allowedApparatuses } = req.body;

    const existingConfig = await ScoringConfig.findById(id);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }
    const oldLevel = existingConfig.level;
    const oldGenders = existingConfig.gender;

    const updatedConfig = await ScoringConfig.findByIdAndUpdate(
      id,
      { level, scoringMethod, baseStartValue, hasBonuses, editableStartValue, hasNeutralDeductions, description, gender, allowedApparatuses: allowedApparatuses || [] },
      { new: true, runValidators: true }
    );

    if (!updatedConfig) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }

    // Si el nombre del nivel cambió, repuntar automáticamente a todos los
    // gimnastas que estaban en el nombre viejo, para que el rename sea
    // idempotente (A->B->A siempre re-agrupa a los mismos gimnastas) y no
    // deje a nadie huérfano silenciosamente.
    let cascade = { gymnastsUpdated: 0, apparatusLevelEntriesUpdated: 0 };
    const trimmedNewLevel = typeof level === 'string' ? level.trim() : level;
    if (trimmedNewLevel && trimmedNewLevel !== oldLevel) {
      cascade = await cascadeLevelRename(oldLevel, trimmedNewLevel, oldGenders);

      if (cascade.gymnastsUpdated > 0 || cascade.apparatusLevelEntriesUpdated > 0) {
        await logAudit({
          action: 'UPDATE',
          entityType: 'scoringConfig',
          entityId: id,
          performedBy: (req as any).user.id,
          performedByRole: (req as any).user.role,
          details: {
            action: 'cascade_rename',
            oldLevel,
            newLevel: trimmedNewLevel,
            gymnastsUpdated: cascade.gymnastsUpdated,
            apparatusLevelEntriesUpdated: cascade.apparatusLevelEntriesUpdated,
          },
        });
      }
    }

    res.json({ ...updatedConfig.toObject(), cascade });
  } catch (error) {
    console.error('Error updating scoring config:', error);
    res.status(500).json({ error: 'Failed to update scoring configuration' });
  }
});

/**
 * DELETE /api/config/scoring/:id
 * Soft delete a scoring configuration (sets active = false)
 * Requires super-admin role
 */
router.delete('/scoring/:id', async (req, res) => {
  try {
    // TODO: Add super-admin check middleware
    const { id } = req.params;
    const { reassignTo } = req.body || {};

    const existingConfig = await ScoringConfig.findById(id);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }

    const { gymnastCount, apparatusLevelEntryCount } = await countGymnastsOnLevel(
      existingConfig.level,
      existingConfig.gender
    );
    const affectedCount = gymnastCount + apparatusLevelEntryCount;

    if (affectedCount > 0 && !reassignTo) {
      const gymnasts = await listGymnastsOnLevel(existingConfig.level, existingConfig.gender);
      return res.status(409).json({
        error: 'level_in_use',
        message: `${affectedCount} gimnasta(s) usan actualmente este nivel`,
        level: existingConfig.level,
        gender: existingConfig.gender,
        affectedCount,
        gymnasts,
      });
    }

    let cascade = { gymnastsUpdated: 0, apparatusLevelEntriesUpdated: 0 };
    if (affectedCount > 0 && reassignTo) {
      const targetConfig = await ScoringConfig.findOne({
        level: reassignTo,
        active: true,
        gender: { $in: existingConfig.gender },
      });
      if (!targetConfig) {
        return res.status(400).json({
          error: `El nivel de destino "${reassignTo}" no existe o no es compatible en género`,
        });
      }

      cascade = await cascadeLevelRename(existingConfig.level, reassignTo, existingConfig.gender);

      await logAudit({
        action: 'UPDATE',
        entityType: 'scoringConfig',
        entityId: id,
        performedBy: (req as any).user.id,
        performedByRole: (req as any).user.role,
        details: {
          action: 'cascade_reassign_before_delete',
          oldLevel: existingConfig.level,
          newLevel: reassignTo,
          gymnastsUpdated: cascade.gymnastsUpdated,
          apparatusLevelEntriesUpdated: cascade.apparatusLevelEntriesUpdated,
        },
      });
    }

    const deletedConfig = await ScoringConfig.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );

    await logAudit({
      action: 'DEACTIVATE',
      entityType: 'scoringConfig',
      entityId: id,
      performedBy: (req as any).user.id,
      performedByRole: (req as any).user.role,
      details: { level: existingConfig.level, reassignedTo: reassignTo || null },
    });

    res.json({ message: 'Scoring configuration deactivated successfully', config: deletedConfig, cascade });
  } catch (error) {
    console.error('Error deleting scoring config:', error);
    res.status(500).json({ error: 'Failed to delete scoring configuration' });
  }
});

export default router;
