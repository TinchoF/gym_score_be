
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
      const category = calculateCategory(gymnast.birthDate, gymnast.gender as 'F' | 'M');

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
      const category = calculateCategory(gymnast.birthDate, gymnast.gender as 'F' | 'M');
      
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
