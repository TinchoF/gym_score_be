
import express from 'express';
import Gymnast from '../models/Gymnast';
import mongoose from 'mongoose';
import Rotation from '../models/Rotation';
import { authenticateToken } from '../middlewares/authMiddleware';
import { calculateCategory } from '../utils/categoryCalculator';
import { logAudit } from '../utils/auditLogger';
import logger from '../utils/logger';
import { validate } from '../middlewares/errorHandler';
import { createGymnastSchema, updateGymnastSchema, bulkUpdateTournamentsSchema, bulkClearTournamentsSchema } from '../schemas/gymnast.schema';

const router = express.Router();
router.use(authenticateToken);

// Get all gymnasts with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, group, gender, tournamentId } = req.query;
    const institutionId = (req as any).user.institutionId;
    const filters: any = { institution: institutionId };
    if (level) filters.level = level;
    if (group) filters.group = group;
    if (gender) filters.gender = gender;
    
    // Filter by tournament (check if gymnast has this tournament in their tournaments array)
    if (tournamentId && mongoose.Types.ObjectId.isValid(tournamentId as string)) {
      filters['tournaments.tournament'] = new mongoose.Types.ObjectId(tournamentId as string);
    }

    const gymnasts = await Gymnast.find(filters);

    const enrichedGymnasts = gymnasts.map((gymnast) => {
      const category = calculateCategory(gymnast.birthDate as Date, gymnast.gender as 'F' | 'M');

      return {
        ...gymnast.toObject(),
        category, // Agregamos la categoría calculada al resultado
      };
    });

    res.json(enrichedGymnasts);
  } catch (error) {
    logger.error('Error fetching gymnasts:', error);
    res.status(500).json({ error: 'Error fetching gymnasts' });
  }
});



// Create new gymnast with validation
router.post('/', validate(createGymnastSchema), async (req, res) => {
  try {
    // Extraer datos del cuerpo de la solicitud
    const { _id, tournamentId, turno, payment, tournaments: tournamentsData, ...gymnastData } = req.body;

    // Handle tournaments array - either from direct array or legacy single tournament
    if (tournamentsData && Array.isArray(tournamentsData)) {
      // New format: tournaments array already provided
      gymnastData.tournaments = tournamentsData.map((t: any) => ({
        tournament: new mongoose.Types.ObjectId(t.tournament || t.tournamentId),
        payment: t.payment || false,
        turno: t.turno || '',
      }));
    } else if (tournamentId) {
      // Legacy format: single tournamentId - convert to array
      gymnastData.tournaments = [{
        tournament: new mongoose.Types.ObjectId(tournamentId),
        payment: payment || false,
        turno: turno || '',
      }];
    }

    // Crear una nueva instancia del modelo con los datos del gimnasta
    const newGymnast = new Gymnast(gymnastData);

    await newGymnast.save();
    res.status(201).json(newGymnast);
  } catch (error) {
    logger.error('Error al crear gimnasta:', error);
    res.status(400).json({ error: 'Error creando gimnasta' });
  }
});

// Bulk add/update tournament enrollment for multiple gymnasts - MUST be before PUT /:id
router.put('/bulk-update-tournaments', validate(bulkUpdateTournamentsSchema), async (req, res) => {
  try {
    const { gymnastIds, tournament, turno, payment } = req.body;
    const institutionId = (req as any).user.institutionId;

    // Validation
    if (!gymnastIds || !Array.isArray(gymnastIds) || gymnastIds.length === 0) {
      return res.status(400).json({ error: 'gymnastIds debe ser un array no vacío' });
    }

    if (!tournament) {
      return res.status(400).json({ error: 'tournament es requerido' });
    }

    // Validate tournament ID
    if (!mongoose.Types.ObjectId.isValid(tournament)) {
      return res.status(400).json({ error: 'tournament ID inválido' });
    }

    // Validate all gymnast IDs
    const invalidIds = gymnastIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `IDs de gimnastas inválidos: ${invalidIds.join(', ')}` });
    }

    // Convert IDs to ObjectId
    const gymnastObjectIds = gymnastIds.map(id => new mongoose.Types.ObjectId(id));
    const tournamentObjectId = new mongoose.Types.ObjectId(tournament);

    // For each gymnast, add or update the tournament enrollment
    let updatedCount = 0;
    for (const gymnastId of gymnastObjectIds) {
      const gymnast = await Gymnast.findOne({ _id: gymnastId, institution: institutionId });
      if (!gymnast) continue;

      // Check if already enrolled in this tournament
      const existingIndex = (gymnast as any).tournaments?.findIndex(
        (t: any) => t.tournament?.toString() === tournamentObjectId.toString()
      ) ?? -1;

      if (existingIndex >= 0) {
        // Update existing enrollment
        const updatePath: any = {};
        if (turno !== undefined) updatePath[`tournaments.${existingIndex}.turno`] = turno;
        if (payment !== undefined) updatePath[`tournaments.${existingIndex}.payment`] = payment;
        
        if (Object.keys(updatePath).length > 0) {
          await Gymnast.updateOne({ _id: gymnastId }, { $set: updatePath });
          updatedCount++;
        }
      } else {
        // Add new enrollment
        await Gymnast.updateOne(
          { _id: gymnastId },
          { 
            $push: { 
              tournaments: { 
                tournament: tournamentObjectId, 
                turno: turno || '', 
                payment: payment || false 
              } 
            } 
          }
        );
        updatedCount++;
      }
    }

    res.json({
      success: true,
      updatedCount,
      message: `${updatedCount} gimnasta(s) actualizado(s) correctamente`
    });

  } catch (error) {
    logger.error('Error en bulk-update-tournaments:', error);
    res.status(500).json({ error: 'Error actualizando gimnastas' });
  }
});

// Bulk clear tournaments for multiple gymnasts
router.put('/bulk-clear-tournaments', validate(bulkClearTournamentsSchema), async (req, res) => {
  try {
    const { gymnastIds, tournament } = req.body;
    const institutionId = (req as any).user.institutionId;

    // Validation
    if (!gymnastIds || !Array.isArray(gymnastIds) || gymnastIds.length === 0) {
      return res.status(400).json({ error: 'gymnastIds debe ser un array no vacío' });
    }

    // Validate all gymnast IDs
    const invalidIds = gymnastIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `IDs de gimnastas inválidos: ${invalidIds.join(', ')}` });
    }

    const gymnastObjectIds = gymnastIds.map(id => new mongoose.Types.ObjectId(id));

    let result;
    if (tournament && mongoose.Types.ObjectId.isValid(tournament)) {
      // Remove specific tournament from enrollments
      const tournamentObjectId = new mongoose.Types.ObjectId(tournament);
      result = await Gymnast.updateMany(
        { _id: { $in: gymnastObjectIds }, institution: institutionId },
        { $pull: { tournaments: { tournament: tournamentObjectId } } }
      );
    } else {
      // Clear all tournament enrollments
      result = await Gymnast.updateMany(
        { _id: { $in: gymnastObjectIds }, institution: institutionId },
        { $set: { tournaments: [] } }
      );
    }

    res.json({
      success: true,
      updatedCount: result.modifiedCount,
      message: `${result.modifiedCount} gimnasta(s) actualizado(s) correctamente`
    });

  } catch (error) {
    logger.error('Error en bulk-clear-tournaments:', error);
    res.status(500).json({ error: 'Error limpiando torneos' });
  }
});


// Update a gymnast
router.put('/:id', validate(updateGymnastSchema), async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID del gimnasta es válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de gimnasta no válido' });
    }

    // Crear un objeto de actualización a partir del cuerpo de la solicitud
    const { tournamentId, turno, payment, tournaments: tournamentsData, ...updateData } = req.body;

    // Handle tournaments array - either from direct array or legacy single tournament
    if (tournamentsData !== undefined) {
      // New format: tournaments array provided (can be full replacement)
      if (Array.isArray(tournamentsData)) {
        updateData.tournaments = tournamentsData.map((t: any) => ({
          tournament: new mongoose.Types.ObjectId(t.tournament || t.tournamentId),
          payment: t.payment || false,
          turno: t.turno || '',
        }));
      }
    } else if (tournamentId) {
      // Legacy format: single tournamentId - need to add/update in tournaments array
      const gymnast = await Gymnast.findById(id);
      if (gymnast) {
        const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId);
        const existingTournaments = (gymnast as any).tournaments || [];
        const existingIndex = existingTournaments.findIndex(
          (t: any) => t.tournament?.toString() === tournamentObjectId.toString()
        );
        
        if (existingIndex >= 0) {
          // Update existing
          existingTournaments[existingIndex] = {
            ...existingTournaments[existingIndex],
            turno: turno ?? existingTournaments[existingIndex].turno,
            payment: payment ?? existingTournaments[existingIndex].payment,
          };
        } else {
          // Add new
          existingTournaments.push({
            tournament: tournamentObjectId,
            payment: payment || false,
            turno: turno || '',
          });
        }
        updateData.tournaments = existingTournaments;
      }
    }

    logger.debug('Updating gymnast:', id, 'with data:', updateData);

    // Actualizar el gimnasta con los datos proporcionados
    const updatedGymnast = await Gymnast.findByIdAndUpdate(id, updateData, { new: true })
      .populate('tournaments.tournament');
    if (!updatedGymnast) {
      return res.status(404).json({ error: 'Gimnasta no encontrado' });
    }
    res.json(updatedGymnast);
  } catch (error) {
    logger.error('Error al actualizar gimnasta:', error);
    res.status(500).json({ error: 'Error actualizando gimnasta' });
  }
});

router.get('/by-rotation', async (req, res) => {
  try {
    const { tournamentId, apparatus, group, turno } = req.query;

    // Validar que los parámetros necesarios estén presentes
    if (!tournamentId || !apparatus || !group) {
      return res.status(400).json({ error: 'Faltan parámetros: tournamentId, apparatus o group' });
    }

    // Validar que tournamentId sea un ObjectId válido
    if (!mongoose.Types.ObjectId.isValid(tournamentId as string)) {
      return res.status(400).json({ error: 'tournamentId no válido' });
    }

    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId as string)

    // Construir el filtro de búsqueda
    // Asegurarnos que 'group' sea number
    const groupNumber = Number(group);
    if (isNaN(groupNumber)) {
      return res.status(400).json({ error: 'group no válido' });
    }

    // Filter by tournaments.tournament array
    const filter: any = { 
      'tournaments.tournament': tournamentObjectId, 
      group: groupNumber,
    };
    
    // Agregar filtro por turno si se proporciona (dentro del array de tournaments)
    if (turno) {
      filter['tournaments'] = { 
        $elemMatch: { 
          tournament: tournamentObjectId, 
          turno: turno 
        } 
      };
    }

    // Filtrar por género según aparato
    const maleOnlyApparatuses = ["Anillas", "Arzones", "Barra", "Paralelas"];
    const femaleOnlyApparatuses = ["Viga", "Barras Asimétricas"];
    
    if (maleOnlyApparatuses.includes(apparatus as string)) {
        filter.gender = 'M';
    } else if (femaleOnlyApparatuses.includes(apparatus as string)) {
        filter.gender = 'F';
    }

    // Buscar gimnastas por torneo, grupo y turno (si se proporciona)
    const gymnasts = await Gymnast.find(filter)
      .populate('tournaments.tournament')
      .lean();

    // Obtener las rotaciones para el aparato y los gimnastas encontrados
    const gymnastIds = gymnasts.map(gymnast => gymnast._id);
    const rotations = await Rotation.find({
      tournament: tournamentObjectId,
      apparatus,
      gymnast: { $in: gymnastIds }
    }).lean();

    // Combinar gimnastas con su rotación correspondiente y calcular categoría
    const results = gymnasts.map(gymnast => {
      const rotation = rotations.find(rot => rot.gymnast.toString() === gymnast._id.toString());
      const category = calculateCategory(gymnast.birthDate as unknown as Date, gymnast.gender as 'F' | 'M');
      
      // Find turno for this specific tournament
      const enrollment = (gymnast as any).tournaments?.find(
        (t: any) => t.tournament?._id?.toString() === tournamentObjectId.toString() || 
                    t.tournament?.toString() === tournamentObjectId.toString()
      );
      
      return {
        ...gymnast,
        category,
        turno: enrollment?.turno || '', // Add turno from enrollment
        payment: enrollment?.payment || false, // Add payment from enrollment
        rotation: rotation || null,
      };
    });

    res.json(results);
  } catch (error) {
    logger.error('Error en el endpoint /by-rotation:', error);
    res.status(500).json({ error: 'Error obteniendo los gimnastas y sus rotaciones' });
  }
});

// Obtener grupos disponibles (distinct group numbers) para un torneo y turno
router.get('/groups', async (req, res) => {
  try {
    const { tournamentId, turno } = req.query;
    if (!tournamentId) return res.status(400).json({ error: 'tournamentId requerido' });
    if (!mongoose.Types.ObjectId.isValid(tournamentId as string)) return res.status(400).json({ error: 'tournamentId inválido' });

    const tournamentObjectId = new mongoose.Types.ObjectId(tournamentId as string);
    
    // Filter by tournaments array
    const filter: any = { 'tournaments.tournament': tournamentObjectId };
    if (turno) {
      filter['tournaments'] = { 
        $elemMatch: { 
          tournament: tournamentObjectId, 
          turno: turno 
        } 
      };
    }

    const groups = await Gymnast.distinct('group', filter);
    // Filtrar y ordenar números válidos
    const numericGroups = groups
      .map(g => Number(g))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    res.json({ groups: numericGroups });
  } catch (error) {
    logger.error('Error en /gymnasts/groups:', error);
    res.status(500).json({ error: 'Error obteniendo grupos' });
  }
});

// Get all gymnasts with incompatible gender-level combinations
router.get('/incompatible', async (req, res) => {
  try {
    const institutionId = (req as any).user.institutionId;
    
    // Import ScoringConfig model
    const ScoringConfig = (await import('../models/ScoringConfig')).default;
    
    // Get all active scoring configs
    const configs = await ScoringConfig.find({ active: true }).lean();
    logger.info(`Found ${configs.length} active scoring configs`);
    
    // Debug: Log first config to check structure
    if (configs.length > 0) {
      logger.debug('Sample config:', JSON.stringify(configs[0]));
    }
    
    // Get all gymnasts for this institution
    const gymnasts = await Gymnast.find({ institution: institutionId }).lean();
    logger.info(`Found ${gymnasts.length} gymnasts for institution ${institutionId}`);
    
    // Find incompatible gymnasts
    const incompatible = gymnasts.filter(gymnast => {
      const config = configs.find((c: any) => c.level === gymnast.level);
      
      // If level not configured, skip (not incompatible, just not configured)
      if (!config) {
        logger.debug(`Gymnast ${gymnast.name} has unconfigured level: ${gymnast.level}`);
        return false;
      }
      
      const gymnastGender = gymnast.gender === 'M' ? 'GAM' : 'GAF';
      const configGender = (config as any).gender;
      
      // If config doesn't have gender field yet (pre-migration), assume it supports both
      if (!configGender || !Array.isArray(configGender)) {
        logger.debug(`Config for level ${gymnast.level} has no gender field or is not an array:`, configGender);
        return false;
      }
      
      // Check if the config's gender array includes the gymnast's gender
      const isCompatible = configGender.includes(gymnastGender);
      
      if (!isCompatible) {
        logger.info(`⚠️  Incompatible: Gymnast ${gymnast.name} (${gymnastGender}) with level ${gymnast.level} (supports: ${configGender.join(', ')})`);
      }
      
      return !isCompatible;
    });
    
    logger.info(`Found ${incompatible.length} incompatible gymnasts`);
    
    // Group by level and gender
    const grouped = incompatible.reduce((acc: any, gymnast) => {
      const key = `${gymnast.level}-${gymnast.gender}`;
      if (!acc[key]) {
        acc[key] = {
          level: gymnast.level,
          gender: gymnast.gender,
          count: 0,
          gymnasts: []
        };
      }
      acc[key].count++;
      acc[key].gymnasts.push({
        _id: gymnast._id,
        name: gymnast.name,
        birthDate: gymnast.birthDate
      });
      return acc;
    }, {});
    
    const result = Object.values(grouped);
    logger.info(`Returning ${result.length} grouped incompatibilities`);
    
    res.json(result);
  } catch (error) {
    logger.error('Error getting incompatible gymnasts:', error);
    res.status(500).json({ error: 'Error getting incompatible gymnasts' });
  }
});

// Bulk migrate gymnasts from one level to another
router.post('/migrate-level', async (req, res) => {
  try {
    const { gymnastIds, targetLevel } = req.body;
    const institutionId = (req as any).user.institutionId;
    const user = (req as any).user;
    
    // Validation
    if (!gymnastIds || !Array.isArray(gymnastIds) || gymnastIds.length === 0) {
      return res.status(400).json({ error: 'gymnastIds must be a non-empty array' });
    }
    
    if (!targetLevel) {
      return res.status(400).json({ error: 'targetLevel is required' });
    }
    
    // Validate all IDs
    const invalidIds = gymnastIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ error: `Invalid gymnast IDs: ${invalidIds.join(', ')}` });
    }
    
    const gymnastObjectIds = gymnastIds.map(id => new mongoose.Types.ObjectId(id));
    
    // Update all gymnasts
    const result = await Gymnast.updateMany(
      { 
        _id: { $in: gymnastObjectIds }, 
        institution: institutionId 
      },
      { 
        $set: { 
          level: targetLevel,
          updatedBy: user._id
        } 
      }
    );
    
    // Audit log for migration
    await logAudit({
      action: 'UPDATE',
      entityType: 'gymnast',
      entityId: gymnastObjectIds[0].toString(), // First gymnast ID for reference
      performedBy: user._id,
      performedByRole: user.role,
      institution: institutionId,
      details: { 
        action: 'level_migration',
        targetLevel,
        gymnastCount: result.modifiedCount,
        gymnastIds: gymnastIds
      },
    });
    
    res.json({
      success: true,
      migratedCount: result.modifiedCount,
      message: `${result.modifiedCount} gymnast(s) migrated to ${targetLevel}`
    });
    
  } catch (error) {
    logger.error('Error migrating gymnasts:', error);
    res.status(500).json({ error: 'Error migrating gymnasts' });
  }
});


// Delete a gymnast
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const institutionId = user.institutionId;
    
    // Verificar que el gimnasta pertenece a la institución del usuario
    const gymnast = await Gymnast.findById(id);
    if (!gymnast) {
      return res.status(404).json({ error: 'Gimnasta no encontrado' });
    }
    if (gymnast.institution?.toString() !== institutionId?.toString()) {
      return res.status(403).json({ error: 'No tiene permiso para eliminar este gimnasta' });
    }
    
    await Gymnast.findByIdAndDelete(id);
    
    // Audit log
    await logAudit({
      action: 'DELETE',
      entityType: 'gymnast',
      entityId: id,
      performedBy: user._id,
      performedByRole: user.role,
      institution: institutionId,
      details: { gymnastName: gymnast.name },
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting gymnast' });
  }
});

export default router;
