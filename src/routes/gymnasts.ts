
import express from 'express';
import Gymnast from '../models/Gymnast';
import mongoose from 'mongoose';
import Rotation from '../models/Rotation';
import { authenticateToken } from '../middlewares/authMiddleware';
import { calculateCategory } from '../utils/categoryCalculator';

const router = express.Router();
router.use(authenticateToken);

// Get all gymnasts with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, group, populateTournament, gender } = req.query;
  const institutionId = (req as any).user.institutionId;
  const filters: any = { institution: institutionId };
    if (level) filters.level = level;
    if (group) filters.group = group;
    if (gender) filters.gender = gender;

    let query = Gymnast.find(filters);

    if (populateTournament === 'true') {
      query = query.populate('tournament');
    }

    const gymnasts = await query;

    const enrichedGymnasts = gymnasts.map((gymnast) => {
      const category = calculateCategory(gymnast.birthDate as Date, gymnast.gender as 'F' | 'M');

      return {
        ...gymnast.toObject(),
        category, // Agregamos la categoría calculada al resultado
      };
    });

    res.json(enrichedGymnasts);
  } catch (error) {
    console.log('ERROR', error);
    res.status(500).json({ error: 'Error fetching gymnasts' });
  }
});



router.post('/', async (req, res) => {
  try {
    // Extraer el campo 'tournament' y otros datos del cuerpo de la solicitud
    const { _id, tournamentId, ...gymnastData } = req.body;

    // Convertir 'tournament' a ObjectId si está presente
    if (tournamentId) {
      gymnastData.tournament = new mongoose.Types.ObjectId(tournamentId);
    }

    // Crear una nueva instancia del modelo con los datos del gimnasta
    const newGymnast = new Gymnast(gymnastData);

    await newGymnast.save();
    res.status(201).json(newGymnast);
  } catch (error) {
    console.log('Error al crear gimnasta:', error);
    res.status(400).json({ error: 'Error creando gimnasta' });
  }
});

// Bulk update turno for multiple gymnasts - MUST be before PUT /:id
router.put('/bulk-update-turno', async (req, res) => {
  try {
    const { gymnastIds, tournament, turno } = req.body;
    const institutionId = (req as any).user.institutionId;

    // Validation
    if (!gymnastIds || !Array.isArray(gymnastIds) || gymnastIds.length === 0) {
      return res.status(400).json({ error: 'gymnastIds debe ser un array no vacío' });
    }

    if (!tournament) {
      return res.status(400).json({ error: 'tournament es requerido' });
    }

    if (!turno) {
      return res.status(400).json({ error: 'turno es requerido' });
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

    // Perform bulk update - only update gymnasts belonging to the user's institution
    const result = await Gymnast.updateMany(
      { 
        _id: { $in: gymnastObjectIds },
        institution: institutionId // Security: only update gymnasts from same institution
      },
      { 
        $set: { 
          tournament: tournamentObjectId,
          turno: turno
        } 
      }
    );

    res.json({
      success: true,
      updatedCount: result.modifiedCount,
      message: `${result.modifiedCount} gimnasta(s) actualizado(s) correctamente`
    });

  } catch (error) {
    console.error('Error en bulk-update-turno:', error);
    res.status(500).json({ error: 'Error actualizando gimnastas' });
  }
});


// Update a gymnast
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validar que el ID del gimnasta es válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de gimnasta no válido' });
    }

    // Crear un objeto de actualización a partir del cuerpo de la solicitud
    const updateData = { ...req.body };

    console.log('updateData.tournament ANTES', updateData.tournamentId)

    // Convertir 'tournament' a ObjectId si está presente en los datos de actualización
    if (updateData.tournamentId) {
      updateData.tournament = new mongoose.Types.ObjectId(updateData.tournamentId);
    }

    console.log('updateData.tournament DESPUES', updateData.tournament)

    // Actualizar el gimnasta con los datos proporcionados
    const updatedGymnast = await Gymnast.findByIdAndUpdate(id, updateData, { new: true });
    if (!updatedGymnast) {
      return res.status(404).json({ error: 'Gimnasta no encontrado' });
    }
    res.json(updatedGymnast);
  } catch (error) {
    console.error('Error al actualizar gimnasta:', error);
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

    const filter: any = { 
      tournament: tournamentObjectId, 
      group: groupNumber,
    };
    
    // Agregar filtro por turno si se proporciona
    if (turno) {
      filter.turno = turno;
    }

    // Filtrar por género según aparato
    const maleApparatuses = ["Suelo", "Arzones", "Anillas", "Salto", "Paralelas", "Barra"];
    const femaleApparatuses = ["Salto", "Paralelas", "Viga", "Suelo"];
    
    // CASOS ESPECIALES: Suelo y Salto y Paralelas (nombres compartidos o similares)
    // Para simplificar, asumiremos que si el cliente manda el aparato, el backend filtra
    // PERO: "Suelo" y "Salto" son mixtos (nombre igual).
    // "Paralelas" en Femenina es Asimétricas, en Masculina es Paralelas.
    // Si la app usa strings distintos, perfecto. Si usa el mismo string, tenemos ambigüedad.
    // Viendo constants.ts del frontend:
    // GAF: ["Salto", "Paralelas", "Viga", "Suelo"]
    // GAM: ["Suelo", "Arzones", "Anillas", "Salto", "Paralelas", "Barra"]
    // Hay colisión en: Suelo, Salto, Paralelas.
    
    // ESTRATEGIA:
    // 1. Anillas, Arzones, Barra -> Solo Masculino (M)
    // 2. Viga -> Solo Femenino (F)
    // 3. Colisiones (Suelo, Salto, Paralelas): No podemos filtrar solo por nombre de aparato.
    //    Necesitamos que el frontend envíe el género O deducirlo de otra forma.
    //    Sin embargo, el requerimiento específico del usuario fue "en anillas no se deben ver mujeres".
    //    Anillas es exclusivo de GAM.
    
    if (["Anillas", "Arzones", "Barra"].includes(apparatus as string)) {
        filter.gender = 'M';
    } else if (["Viga"].includes(apparatus as string)) {
        filter.gender = 'F';
    }
    // Para los aparatos compartidos, no filtramos por género automáticamente a menos que cambie la lógica de nombres.

    // Buscar gimnastas por torneo, grupo y turno (si se proporciona)
    const gymnasts = await Gymnast.find(filter)
      .populate('tournament') // Popula el torneo
      .lean(); // Convierte los documentos a objetos JavaScript planos

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
      
      return {
        ...gymnast,
        category, // Agregar categoría calculada
        rotation: rotation || null, // Si no tiene rotación, se asigna null
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error en el endpoint /by-rotation:', error);
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
    const filter: any = { tournament: tournamentObjectId };
    if (turno) filter.turno = turno;

    const groups = await Gymnast.distinct('group', filter);
    // Filtrar y ordenar números válidos
    const numericGroups = groups
      .map(g => Number(g))
      .filter(n => !isNaN(n) && n > 0)
      .sort((a, b) => a - b);

    res.json({ groups: numericGroups });
  } catch (error) {
    console.error('Error en /gymnasts/groups:', error);
    res.status(500).json({ error: 'Error obteniendo grupos' });
  }
});



// Delete a gymnast
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Gymnast.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting gymnast' });
  }
});

export default router;
