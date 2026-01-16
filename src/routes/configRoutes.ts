import express from 'express';
import Config from '../models/Config';
import ScoringConfig from '../models/ScoringConfig';

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
    const configs = await ScoringConfig.find({ active: true }).sort({ level: 1 });
    res.json(configs);
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
    const { level, scoringMethod, baseStartValue, hasBonuses, description, gender } = req.body;
    
    // Check if level already exists
    const existing = await ScoringConfig.findOne({ level });
    if (existing) {
      return res.status(400).json({ error: 'Level configuration already exists' });
    }
    
    const newConfig = new ScoringConfig({
      level,
      scoringMethod,
      baseStartValue,
      hasBonuses,
      description,
      gender: gender || ['GAM', 'GAF'], // Default to both if not specified
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
    const { level, scoringMethod, baseStartValue, hasBonuses, description, gender } = req.body;
    
    const updatedConfig = await ScoringConfig.findByIdAndUpdate(
      id,
      { level, scoringMethod, baseStartValue, hasBonuses, description, gender },
      { new: true, runValidators: true }
    );
    
    if (!updatedConfig) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }
    
    res.json(updatedConfig);
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
    
    const deletedConfig = await ScoringConfig.findByIdAndUpdate(
      id,
      { active: false },
      { new: true }
    );
    
    if (!deletedConfig) {
      return res.status(404).json({ error: 'Scoring configuration not found' });
    }
    
    res.json({ message: 'Scoring configuration deactivated successfully', config: deletedConfig });
  } catch (error) {
    console.error('Error deleting scoring config:', error);
    res.status(500).json({ error: 'Failed to delete scoring configuration' });
  }
});

export default router;
