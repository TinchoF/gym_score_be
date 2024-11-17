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
const Judge_1 = __importDefault(require("../models/Judge"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Get all judges
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const judges = yield Judge_1.default.find();
        res.json(judges);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching judges' });
    }
}));
// Create a judge
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newJudge = new Judge_1.default(req.body);
        yield newJudge.save();
        res.status(201).json(newJudge);
    }
    catch (error) {
        res.status(400).json({ error: 'Error creating judge' });
    }
}));
// Update a judge by ID
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Obtener el ID de la URL
        const updatedData = req.body; // Obtener los nuevos datos del cuerpo de la solicitud
        // Validar si el ID es válido
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID no válido' });
        }
        // Buscar y actualizar el juez
        const updatedJudge = yield Judge_1.default.findByIdAndUpdate(id, updatedData, { new: true });
        // Verificar si el juez fue encontrado y actualizado
        if (!updatedJudge) {
            return res.status(404).json({ error: 'Juez no encontrado' });
        }
        // Responder con el juez actualizado
        res.json(updatedJudge);
    }
    catch (error) {
        console.error('Error al actualizar juez:', error);
        res.status(500).json({ error: 'Error actualizando juez' });
    }
}));
exports.default = router;
