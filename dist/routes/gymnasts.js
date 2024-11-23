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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Gymnast_1 = __importDefault(require("../models/Gymnast"));
const mongoose_1 = __importDefault(require("mongoose"));
const Rotation_1 = __importDefault(require("../models/Rotation"));
const router = express_1.default.Router();
// Get all gymnasts with optional filters
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { level, category, group, populateTournament } = req.query;
        const filters = {};
        if (level)
            filters.level = level;
        if (category)
            filters.category = category;
        if (group)
            filters.group = group;
        let query = Gymnast_1.default.find(filters);
        if (populateTournament === 'true') {
            query = query.populate('tournament');
        }
        const gymnasts = yield query;
        res.json(gymnasts);
    }
    catch (error) {
        console.log('ERROR', error);
        res.status(500).json({ error: 'Error fetching gymnasts' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extraer el campo 'tournament' y otros datos del cuerpo de la solicitud
        const _a = req.body, { _id, tournamentId } = _a, gymnastData = __rest(_a, ["_id", "tournamentId"]);
        // Convertir 'tournament' a ObjectId si está presente
        if (tournamentId) {
            gymnastData.tournament = new mongoose_1.default.Types.ObjectId(tournamentId);
        }
        // Crear una nueva instancia del modelo con los datos del gimnasta
        const newGymnast = new Gymnast_1.default(gymnastData);
        yield newGymnast.save();
        res.status(201).json(newGymnast);
    }
    catch (error) {
        console.log('Error al crear gimnasta:', error);
        res.status(400).json({ error: 'Error creando gimnasta' });
    }
}));
// Update a gymnast
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        // Validar que el ID del gimnasta es válido
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID de gimnasta no válido' });
        }
        // Crear un objeto de actualización a partir del cuerpo de la solicitud
        const updateData = Object.assign({}, req.body);
        console.log('updateData.tournament ANTES', updateData.tournamentId);
        // Convertir 'tournament' a ObjectId si está presente en los datos de actualización
        if (updateData.tournamentId) {
            updateData.tournament = new mongoose_1.default.Types.ObjectId(updateData.tournamentId);
        }
        console.log('updateData.tournament DESPUES', updateData.tournament);
        // Actualizar el gimnasta con los datos proporcionados
        const updatedGymnast = yield Gymnast_1.default.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedGymnast) {
            return res.status(404).json({ error: 'Gimnasta no encontrado' });
        }
        res.json(updatedGymnast);
    }
    catch (error) {
        console.error('Error al actualizar gimnasta:', error);
        res.status(500).json({ error: 'Error actualizando gimnasta' });
    }
}));
router.get('/by-rotation', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { tournamentId, apparatus, group } = req.query;
        // Validar que los parámetros necesarios estén presentes
        if (!tournamentId || !apparatus || !group) {
            return res.status(400).json({ error: 'Faltan parámetros: tournamentId, apparatus o group' });
        }
        // Validar que tournamentId sea un ObjectId válido
        if (!mongoose_1.default.Types.ObjectId.isValid(tournamentId)) {
            return res.status(400).json({ error: 'tournamentId no válido' });
        }
        const tournamentObjectId = new mongoose_1.default.Types.ObjectId(tournamentId);
        // Buscar gimnastas por torneo y grupo
        const gymnasts = yield Gymnast_1.default.find({
            tournament: tournamentObjectId,
            group
        })
            .populate('tournament') // Popula el torneo
            .lean(); // Convierte los documentos a objetos JavaScript planos
        // Obtener las rotaciones para el aparato y los gimnastas encontrados
        const gymnastIds = gymnasts.map(gymnast => gymnast._id);
        const rotations = yield Rotation_1.default.find({
            tournament: tournamentId,
            apparatus,
            gymnast: { $in: gymnastIds }
        }).lean();
        // Combinar gimnastas con su rotación correspondiente
        const results = gymnasts.map(gymnast => {
            const rotation = rotations.find(rot => rot.gymnast.toString() === gymnast._id.toString());
            return Object.assign(Object.assign({}, gymnast), { rotation: rotation || null });
        });
        res.json(results);
    }
    catch (error) {
        console.error('Error en el endpoint /by-rotation:', error);
        res.status(500).json({ error: 'Error obteniendo los gimnastas y sus rotaciones' });
    }
}));
// Delete a gymnast
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield Gymnast_1.default.findByIdAndDelete(id);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting gymnast' });
    }
}));
exports.default = router;
