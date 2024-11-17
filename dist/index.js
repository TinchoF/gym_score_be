"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
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
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
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
// Protected Routes
app.use(authMiddleware_1.authenticateToken); // Este middleware protege las siguientes rutas
app.use('/api/admins', admins_1.default);
app.use('/api/gymnasts', gymnasts_1.default);
app.use('/api/judges', judges_1.default);
app.use('/api/assignments', assignments_1.default);
app.use('/api/results', results_1.default);
app.use('/api/export', export_1.default);
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
