import express from 'express';
import http from 'http';
import path from 'path';
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
import offlineRoutes from './routes/offlineRoutes';
import offlineLocalRoutes from './routes/offlineLocalRoutes';
import { offlineLockGuard } from './middlewares/offlineLock';
import { superAdminScope } from './middlewares/superAdminScope';
import logger from './utils/logger';
import errorHandler from './middlewares/errorHandler';
import rateLimit from 'express-rate-limit';

dotenv.config();

// "Modo Sede": when true, this process is the local server running on a laptop in
// the venue (inside the Electron app). It talks to a local MongoDB, serves the
// built frontend, and never enforces the online read-only lock. See docs/MODO_SEDE.md.
const OFFLINE_MODE = process.env.OFFLINE_MODE === 'true';
const OFFLINE_MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gymscore';

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('CRITICAL ERROR: JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

if (!process.env.MONGO_URI && !OFFLINE_MODE) {
  console.error('CRITICAL ERROR: MONGO_URI is not defined in environment variables');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

// Lista de orígenes permitidos desde variables de entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'http://192.168.100.227:3000',
      'https://gymnastic-score-fe-ca9e6d777188.herokuapp.com'
    ];

// In Modo Sede the server is reached over the local Wi-Fi from many judge devices
// on arbitrary LAN IPs, so any origin is allowed. Online it stays locked down.
const isOriginAllowed = (origin?: string) => {
  if (!origin) return true;
  if (OFFLINE_MODE) return true;
  return allowedOrigins.includes(origin.replace(/\/$/, ''));
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'], // Métodos permitidos para Socket.IO
    credentials: true, // Permitir envío de cookies y headers de autenticación
    allowedHeaders: ['Content-Type', 'Authorization', 'x-institution-id'], // Headers permitidos
  }
});

const PORT = process.env.PORT || 5000;
app.set('socketio', io);
app.set('etag', false); // Disable 304 Not Modified responses
app.set('trust proxy', 1); // Trust Heroku's proxy so rate limiters use real client IPs

// Rate limiting for authentication routes
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  // Modo Sede: many judges hitting the same laptop, no abuse risk on a private LAN.
  max: OFFLINE_MODE ? 100000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Demasiados intentos de autenticación, por favor intente más tarde',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware para verificar el token de autenticación
io.use((socket, next) => {
  const token = socket.handshake.query.token as string;

  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }

  // Verificar el token JWT
  jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
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

  // Join tournament room for targeted broadcasting
  socket.on('joinTournament', (tournamentId: string) => {
    socket.join(`tournament_${tournamentId}`);
    logger.debug(`Socket ${socket.id} joined tournament_${tournamentId}`);
  });

  // Leave tournament room
  socket.on('leaveTournament', (tournamentId: string) => {
    socket.leave(`tournament_${tournamentId}`);
    logger.debug(`Socket ${socket.id} left tournament_${tournamentId}`);
  });

  // Escuchar el evento de actualización de puntaje
  socket.on('scoreUpdated', (updatedScore) => {
    logger.debug('Puntaje actualizado recibido:', updatedScore);

    // Emitir solo a clientes en el room del torneo específico
    const tournamentId = updatedScore.tournament?._id || updatedScore.tournament;
    if (tournamentId) {
      io.to(`tournament_${tournamentId}`).emit('scoreUpdated', updatedScore);
      logger.debug(`Emitiendo scoreUpdated a tournament_${tournamentId}`);
    } else {
      // Fallback: broadcast a todos si no hay tournamentId
      io.emit('scoreUpdated', updatedScore);
      logger.debug('Emitiendo scoreUpdated a todos (no tournamentId)');
    }
  });

  // Otras acciones cuando el cliente se desconecta, etc.
  socket.on('disconnect', () => {
    logger.debug('Client disconnected:', socket.id);
  });
});



// Configuración de CORS para Express
app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-institution-id'],
}));

// Middleware

// El API devuelve JSON que depende del token y de x-institution-id → nunca cachear.
// Sin esto el browser reusaba la respuesta de /api/gymnasts de otra institución al
// cambiar de scope (misma URL, sin Vary).
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Modo Sede: servir el frontend empaquetado ANTES de cualquier cosa de /api y del
// authenticateToken global (si no, GET / devuelve "Access denied"). express.static
// resuelve los assets; el catch-all sirve index.html para las rutas de React.
if (OFFLINE_MODE && process.env.FRONTEND_BUILD_PATH) {
  const buildPath = path.resolve(process.env.FRONTEND_BUILD_PATH);
  app.use(express.static(buildPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(buildPath, 'index.html'));
  });
  logger.info(`Modo Sede: serving frontend from ${buildPath}`);
}

// Modo Sede: los payloads de bundle/sync llevan una institución entera, así que
// estas rutas necesitan su propio body-parser con límite alto ANTES del global
// (100kb). `/api/offline` va acá arriba (con authenticateToken inline) para quedar
// además por delante del `offlineLockGuard`. Ver docs/MODO_SEDE.md.
const bigJson = express.json({ limit: '200mb' });
app.use('/api/offline', authenticateToken, bigJson, offlineRoutes);
app.use('/api/offline-local', bigJson, offlineLocalRoutes); // gateado por OFFLINE_MODE + secreto adentro

app.use(express.json());

// Public Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/public-judges', publicJudgesRouter);
app.use('/api/institution', institutionRoutes);

// Protected Routes
app.use(authenticateToken);  // Este middleware protege las siguientes rutas

// El super-admin elige institución en el header de la web (x-institution-id) →
// se comporta como admin de esa institución para el scoping de datos.
app.use(superAdminScope);

// From here down, writes are blocked for users of an institution in Modo Sede.
app.use(offlineLockGuard);

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

mongoose.connect(OFFLINE_MODE ? OFFLINE_MONGO_URI : process.env.MONGO_URI!, {
  serverSelectionTimeoutMS: 10000, // Tiempo de espera: 10 segundos
})
  .then(() => {
    logger.info(`Connected to MongoDB${OFFLINE_MODE ? ' (Modo Sede — local)' : ''}`);
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  });

