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
const Score_1 = __importDefault(require("../models/Score"));
const mongoose_1 = __importDefault(require("mongoose"));
const Gymnast_1 = __importDefault(require("../models/Gymnast"));
const router = express_1.default.Router();
// Get results by group
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const results = yield Score_1.default.find();
        res.json(results);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error fetching results' });
    }
}));
// Submit scores
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gymnastId, apparatus, deductions, tournament } = req.body;
        if (!mongoose_1.default.Types.ObjectId.isValid(gymnastId)) {
            return res.status(400).json({ error: 'ID no válido' });
        }
        // Verifica que gymnastId es un ObjectId válido
        const gymnastObjectId = new mongoose_1.default.Types.ObjectId(gymnastId);
        const gymnast = yield Gymnast_1.default.findById(gymnastObjectId);
        if (!gymnast) {
            return res.status(400).json({ error: 'Gymnast not found' });
        }
        // Busca si existe el documento con la combinación de gymnastId, apparatus y tournament
        let score = yield Score_1.default.findOne({ gymnast: gymnastObjectId, apparatus, tournament });
        if (score) {
            // Si el documento existe, lo actualizamos
            score.deductions = deductions;
            score.save();
        }
        else {
            // Si no existe, lo creamos
            score = yield Score_1.default.create({
                gymnast: gymnastObjectId,
                apparatus,
                deductions,
                tournament,
            });
        }
        // Emitir evento de WebSocket cuando el puntaje se actualiza o crea
        const io = req.app.get('socketio'); // Acceder a la instancia de socket.io
        io.emit('scoreUpdated', score); // Emitir el evento 'scoreUpdated' a todos los clientes
        res.status(201).json(score);
    }
    catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Error submitting score' });
    }
}));
exports.default = router;
