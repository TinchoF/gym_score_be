"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const gymnasts_1 = __importDefault(require("./routes/gymnasts"));
const judges_1 = __importDefault(require("./routes/judges"));
const auth_1 = __importDefault(require("./routes/auth"));
const admins_1 = __importDefault(require("./routes/admins"));
const assignments_1 = __importDefault(require("./routes/assignments"));
const results_1 = __importDefault(require("./routes/results"));
const export_1 = __importDefault(require("./routes/export"));
const authMiddleware_1 = require("./middlewares/authMiddleware");
const cors_1 = __importDefault(require("cors"));
const configRoutes_1 = __importDefault(require("./routes/configRoutes"));
const publicJudgesRouter_1 = __importDefault(require("./routes/publicJudgesRouter"));
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
        allowedHeaders: ['my-custom-header'],
        credentials: true, // Permitir credenciales (cookies o headers)
    }
});
const PORT = process.env.PORT || 5000;
app.set('socketio', io);
// Middleware para verificar el token de autenticación
io.use((socket, next) => {
    const token = socket.handshake.query.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided.'));
    }
    // Verificar el token JWT (ajusta la clave secreta según corresponda)
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return next(new Error('Authentication error: Invalid token.'));
        }
        // Agregar el usuario decodificado a la conexión de socket
        socket.data.user = decoded;
        next();
    });
});
io.on('connection', (socket) => {
    console.log('New client connected:', socket.data.user);
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
    socket.on('scoreUpdated', (updatedScore) => {
        io.emit('scoreUpdated', updatedScore);
    });
});
// Verifica que MONGO_URI esté definido
if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not defined in the environment variables');
    process.exit(1); // Termina el proceso con un error si no está definido
}
// Configuración de CORS
app.use((0, cors_1.default)({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true, // Si es necesario enviar cookies o headers específicos
}));
// Middleware
app.use(express_1.default.json());
// Public Routes
app.use('/api/auth', auth_1.default);
app.use('/api/public-judges', publicJudgesRouter_1.default);
// Protected Routes
app.use(authMiddleware_1.authenticateToken); // Este middleware protege las siguientes rutas
app.use('/api/judges', judges_1.default);
app.use('/api/admins', admins_1.default);
app.use('/api/gymnasts', gymnasts_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/scores', results_1.default);
app.use('/api/export', export_1.default);
app.use('/api/config', configRoutes_1.default);
// MongoDB Connection
mongoose_1.default.connect(process.env.MONGO_URI)
    .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
    .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1); // Termina el proceso si no se puede conectar a la base de datos
});
