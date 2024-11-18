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
import cors from 'cors';
import configRoutes from './routes/configRoutes';
import publicJudgesRouter from './routes/publicJudgesRouter';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Verifica que MONGO_URI esté definido
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in the environment variables');
  process.exit(1); // Termina el proceso con un error si no está definido
}

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:3000', // URL de tu frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
  credentials: true, // Si es necesario enviar cookies o headers específicos
}));

// Middleware
app.use(express.json());

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/public-judges', publicJudgesRouter);

// Protected Routes
app.use(authenticateToken);  // Este middleware protege las siguientes rutas
app.use('/api/judges', judgeRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/gymnasts', gymnastRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/scores', resultRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/config', configRoutes); 

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Termina el proceso si no se puede conectar a la base de datos
  });
