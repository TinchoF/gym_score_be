import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import gymnastRoutes from './routes/gymnasts';
import judgeRoutes from './routes/judges';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admins';
import assignmentRoutes from './routes/assignments';
import resultRoutes from './routes/results';
import exportRoutes from './routes/export';
import { authenticateToken } from './middlewares/authMiddleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Public Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use(authenticateToken);
app.use('/api/admins', adminRoutes);
app.use('/api/gymnasts', gymnastRoutes);
app.use('/api/judges', judgeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/export', exportRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || '')
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => console.error('MongoDB connection error:', error));
