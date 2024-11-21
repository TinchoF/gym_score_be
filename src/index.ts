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
import { authenticateToken } from './middlewares/authMiddleware';
import cors from 'cors';
import configRoutes from './routes/configRoutes';
import publicJudgesRouter from './routes/publicJudgesRouter';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import tournamentRoutes from './routes/tournamentRoutes';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FE_URL, // URL de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
    credentials: true, // Si es necesario enviar cookies o headers específicos
    allowedHeaders: ['Content-Type', 'Authorization'], // Asegúrate de que los headers necesarios estén permitidos
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
  console.log('New client connected:', socket.id);  // Esto se ejecuta cuando un cliente se conecta

  // Escuchar el evento de actualización de puntaje
  socket.on('scoreUpdated', (updatedScore) => {
    console.log('Puntaje actualizado recibido:', updatedScore);  // Aquí verificas el puntaje recibido

    // Emitir el evento para todos los clientes conectados
    io.emit('scoreUpdated', updatedScore);

    // Verificar si se está emitiendo correctamente
    console.log('Emitiendo el evento scoreUpdated:', updatedScore);
  });

  // Otras acciones cuando el cliente se desconecta, etc.
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Verifica que MONGO_URI esté definido
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not defined in the environment variables');
  process.exit(1); // Termina el proceso con un error si no está definido
}

// Configuración de CORS
app.use(cors({
  origin: process.env.FE_URL, // URL de tu frontend
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
app.use('/api/scores', resultRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/config', configRoutes);
app.use('/api/tournaments', tournamentRoutes);

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000, // Tiempo de espera: 10 segundos
})
  .then(() => {
    console.log('Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

