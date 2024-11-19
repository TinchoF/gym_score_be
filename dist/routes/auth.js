"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = __importDefault(require("../models/Admin")); // Asegúrate de que la ruta sea correcta
const Judge_1 = __importDefault(require("../models/Judge")); // Asegúrate de que la ruta sea correcta
const authController_1 = require("./authController");
const router = express_1.default.Router();
// Ruta para login
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Log in');
    const { username, password, role } = req.body; // role puede ser 'admin' o 'judge'
    console.log('req.body', req.body);
    const all = yield Admin_1.default.find();
    console.log('all users from DB', all);
    try {
        let user;
        if (role === 'admin') {
            // Buscar en los admins
            user = yield Admin_1.default.findOne({ username });
            // Verificar si la contraseña es correcta (en el caso de los admins la contraseña está encriptada)
            if (!user || !user.comparePassword(password)) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        else if (role === 'judge') {
            // Buscar en los jueces
            user = yield Judge_1.default.findOne({ name: username });
            // Verificar si el juez existe
            if (!user || user.password !== password) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
        }
        else {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // Si todo es correcto, generar el token
        const token = jsonwebtoken_1.default.sign({ id: user._id, role }, process.env.JWT_SECRET || '', {
            expiresIn: '24h',
        });
        res.json({ token });
    }
    catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// Ruta para obtener la lista de jueces
router.get('/public-judges', authController_1.getJudgesList);
exports.default = router;
