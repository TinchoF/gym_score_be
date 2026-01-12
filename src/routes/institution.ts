import express from 'express';
import Institution from '../models/Institution';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();

// Listar instituciones (solo super-admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    
    // Solo super-admin puede ver todas las instituciones
    if (user.role !== 'super-admin') {
      return res.status(403).json({ error: 'No tiene permiso para ver todas las instituciones' });
    }
    
    const institutions = await Institution.find();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las instituciones' });
  }
});

// Obtener institución por código (GET público pero con datos limitados)
// Solo devuelve datos mínimos necesarios para el login
router.get('/by-code/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const institution = await Institution.findOne({ institutionCode: code });
    if (!institution) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }
    // Solo devolver datos mínimos - sin exponer información sensible
    res.json({
      _id: institution._id,
      name: institution.name,
      institutionCode: institution.institutionCode,
      isActive: institution.isActive,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener la institución' });
  }
});

// Crear una institución
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Solo el super-admin puede crear instituciones' });
    }
    const { name, institutionCode } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    // Validate institutionCode format if provided
    if (institutionCode && !/^[a-z0-9-]+$/.test(institutionCode)) {
      return res.status(400).json({ error: 'El código debe contener solo letras minúsculas, números y guiones' });
    }
    
    // Check if code already exists
    if (institutionCode) {
      const existing = await Institution.findOne({ institutionCode });
      if (existing) {
        return res.status(400).json({ error: 'Ya existe una institución con ese código' });
      }
    }
    
    const institutionData: any = { name };
    if (institutionCode) institutionData.institutionCode = institutionCode;
    
    const institution = await Institution.create(institutionData);
    res.status(201).json(institution);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe una institución con ese código' });
    }
    res.status(500).json({ error: 'Error al crear la institución' });
  }
});

// Actualizar una institución
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super-admin') {
      return res.status(403).json({ error: 'Solo el super-admin puede actualizar instituciones' });
    }
    
    const { id } = req.params;
    const { name, institutionCode, isActive } = req.body;
    
    if (name === undefined && institutionCode === undefined && isActive === undefined) {
      return res.status(400).json({ error: 'Debe proporcionar al menos un campo para actualizar' });
    }
    
    // Validate institutionCode format if provided
    if (institutionCode && !/^[a-z0-9-]+$/.test(institutionCode)) {
      return res.status(400).json({ error: 'El código debe contener solo letras minúsculas, números y guiones' });
    }
    
    // Check if code already exists (excluding current institution)
    if (institutionCode) {
      const existing = await Institution.findOne({ institutionCode, _id: { $ne: id } });
      if (existing) {
        return res.status(400).json({ error: 'Ya existe una institución con ese código' });
      }
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (institutionCode !== undefined) updateData.institutionCode = institutionCode;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const institution = await Institution.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!institution) {
      return res.status(404).json({ error: 'Institución no encontrada' });
    }
    
    res.json(institution);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe una institución con ese código' });
    }
    res.status(500).json({ error: 'Error al actualizar la institución' });
  }
});

export default router;
