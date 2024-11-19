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
exports.authenticateToken = void 0;
const Admin_1 = __importDefault(require("../models/Admin"));
const Judge_1 = __importDefault(require("../models/Judge"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Middleware para verificar el token
const authenticateToken = (req, res, next) => {
    var _a;
    const token = (_a = req.headers['authorization']) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access denied' });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || '', (err, user) => __awaiter(void 0, void 0, void 0, function* () {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        const { id, role } = user;
        if (role === 'admin') {
            // Buscar el admin en la base de datos usando el id
            const admin = yield Admin_1.default.findById(id);
            if (!admin)
                return res.status(403).json({ error: 'Admin not found' });
        }
        else if (role === 'judge') {
            // Buscar el juez en la base de datos usando el id
            const judge = yield Judge_1.default.findById(id);
            if (!judge)
                return res.status(403).json({ error: 'Judge not found' });
        }
        else {
            return res.status(403).json({ error: 'Invalid role' });
        }
        // Si todo es válido, continuar con la solicitud
        req.user = user;
        next();
    }));
};
exports.authenticateToken = authenticateToken;
