import express from 'express';
import Admin from '../models/Admin';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middlewares/authMiddleware';

const router = express.Router();
router.use(authenticateToken);

// Get all admins
router.get('/', async (req, res) => {
  try {
    const user = (req as any).user;
    let admins;
    if (user.role === 'super-admin') {
      // El super-admin ve solo admins (no super-admins)
      admins = await Admin.find();
    } else {
      // Un admin normal ve solo los admins de su institución
      admins = await Admin.find({ institution: user.institutionId });
    }
    res.json(admins);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching admins' });
  }
});

// Create an admin
router.post('/', async (req, res) => {
  try {
    const user = (req as any).user;
    const { username, password, institution, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Si el usuario es super-admin, puede crear admins para cualquier institución y otros super-admins
    let newAdmin;
    const allowedRoles = ['admin', 'super-admin'];
    const newRole = allowedRoles.includes(role) ? role : 'admin';
    if (user.role === 'super-admin') {
      newAdmin = new Admin({ username, password: hashedPassword, institution, role: newRole });
    } else {
      // Un admin normal solo puede crear admins para su propia institución
      newAdmin = new Admin({ username, password: hashedPassword, institution: user.institutionId, role: 'admin' });
    }
    await newAdmin.save();
    res.status(201).json(newAdmin);
  } catch (error) {
    res.status(400).json({ error: 'Error creating admin' });
  }
});

// Delete an admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Admin.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Error deleting admin' });
  }
});

// Update an admin
router.put('/:id', async (req, res) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { username, password, institution, role } = req.body;

    // Solo el super-admin puede modificar cualquier admin, los demás solo los de su institución
    const adminToUpdate = await Admin.findById(id);
    if (!adminToUpdate) {
      return res.status(404).json({ error: 'Admin not found' });
    }
    if (user.role !== 'super-admin' && String(adminToUpdate.institution) !== String(user.institutionId)) {
      return res.status(403).json({ error: 'No autorizado para modificar este admin' });
    }

    // Actualizar campos
    if (username) adminToUpdate.username = username;
    if (role && user.role === 'super-admin') adminToUpdate.role = role;
    if (institution && user.role === 'super-admin') adminToUpdate.institution = institution;
    if (password) {
      adminToUpdate.password = await bcrypt.hash(password, 10);
    }
    await adminToUpdate.save();
    res.json(adminToUpdate);
  } catch (error) {
    res.status(400).json({ error: 'Error updating admin' });
  }
});

export default router;
