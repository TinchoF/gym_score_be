
import express from 'express';
import Gymnast from '../models/Gymnast';
import mongoose from 'mongoose';

const router = express.Router();

// Get all gymnasts with optional filters
router.get('/', async (req, res) => {
  try {
    const { level, category, group } = req.query;
    const filters: any = {};
    if (level) filters.level = level;
    if (category) filters.category = category;
    if (group) filters.group = group;

    const gymnasts = await Gymnast.find(filters);
    res.json(gymnasts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching gymnasts' });
  }
});

// Create a gymnast
router.post('/', async (req, res) => {
  try {
    // Eliminar _id del body antes de crear el nuevo objeto
    const { _id, ...gymnastData } = req.body;

    // Crear una nueva instancia del modelo sin el _id
    const newGymnast = new Gymnast(gymnastData);

    await newGymnast.save();
    res.status(201).json(newGymnast);
  } catch (error) {
    console.log(error);
    res.status(400).json({ error: 'Error creating gymnast' });
  }
});


// Update a gymnast
// Actualiza la ruta PUT para que espere el ID en la URL
router.put('/:id', async (req, res) => { // Cambié la ruta para aceptar el ID en la URL
  try {
    const { id } = req.params; // Obtener el ID de los parámetros de la URL
    console.log('body', req.body); // Verificar el cuerpo de la solicitud

    console.log('ID: ', id); // Asegurarse de que el ID se pasa correctamente

    // Valida y convierte el ID a ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID no válido' });
    }

    // Actualiza el gimnasta con el ID en la URL
    const updatedGymnast = await Gymnast.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedGymnast) {
      return res.status(404).json({ error: 'Gimnasta no encontrado' });
    }
    res.json(updatedGymnast);
  } catch (error) {
    console.error('Error al actualizar gimnasta:', error);
    res.status(500).json({ error: 'Error actualizando gimnasta' });
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
