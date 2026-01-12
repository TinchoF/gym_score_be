import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import gymnastRoutes from './routes/gymnasts';
import judgeRoutes from './routes/judges';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admins';
import resultRoutes from './routes/results';
import exportRoutes from './routes/export';
import rotationRoutes from './routes/rotation';
import { authenticateToken } from './middlewares/authMiddleware';
import cors from 'cors';
import configRoutes from './routes/configRoutes';
import publicJudgesRouter from './routes/publicJudgesRouter';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import tournamentRoutes from './routes/tournamentRoutes';
import institutionRoutes from './routes/institution';
import logger from './utils/logger';
import errorHandler from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Lista de orígenes permitidos
const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.100.227:3000',
  'https://gymnastic-score-fe-ca9e6d777188.herokuapp.com'
];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Permitir requests sin origin (como mobile apps o Postman)
      if (!origin) return callback(null, true);
      
      // Remover trailing slash si existe
      const normalizedOrigin = origin.replace(/\/$/, '');
      
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'], // Métodos permitidos para Socket.IO
    credentials: true, // Permitir envío de cookies y headers de autenticación
    allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
  }
});

const PORT = process.env.PORT || 5000;
app.set('socketio', io);

// Middleware para verificar el token de autenticación
io.use((socket, next) => {
  const token = socket.handshake.query.token as string;

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  // Verificar el token JWT (ajusta la clave secreta según corresponda)
  jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token.'));
    }

    // Agregar el usuario decodificado a la conexión de socket
    socket.data.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  logger.debug('New client connected:', socket.id);

  // Escuchar el evento de actualización de puntaje
  socket.on('scoreUpdated', (updatedScore) => {
    logger.debug('Puntaje actualizado recibido:', updatedScore);

    // Emitir el evento para todos los clientes conectados
    io.emit('scoreUpdated', updatedScore);

    logger.debug('Emitiendo el evento scoreUpdated:', updatedScore);
  });

  // Otras acciones cuando el cliente se desconecta, etc.
  socket.on('disconnect', () => {
    logger.debug('Client disconnected:', socket.id);
  });
});

// Verifica que MONGO_URI esté definido
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in the environment variables');
  process.exit(1); // Termina el proceso con un error si no está definido
}

// Configuración de CORS para Express
app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (como mobile apps o Postman)
    if (!origin) return callback(null, true);
    
    // Remover trailing slash si existe
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/public-judges', publicJudgesRouter);
app.use('/api/institution', institutionRoutes);

// Protected Routes
app.use(authenticateToken);  // Este middleware protege las siguientes rutas
app.use('/api/judges', judgeRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/gymnasts', gymnastRoutes);
app.use('/api/scores', resultRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/rotations', rotationRoutes);

// Global error handler - must be last
app.use(errorHandler);

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // Tiempo de espera: 10 segundos
})
  .then(() => {
    logger.info('Connected to MongoDB');
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

