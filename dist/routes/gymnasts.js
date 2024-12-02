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
        const { level, group, populateTournament, gender } = req.query;
        const filters = {};
        if (level)
            filters.level = level;
        if (group)
            filters.group = group;
        if (gender)
            filters.gender = gender;
        let query = Gymnast_1.default.find(filters);
        if (populateTournament === 'true') {
            query = query.populate('tournament');
        }
        const gymnasts = yield query;
        const enrichedGymnasts = gymnasts.map((gymnast) => {
            const birthDate = new Date(gymnast.birthDate); // Asumiendo que cada gimnasta tiene un campo `birthDate`
            const endOfYear = new Date(new Date().getFullYear(), 11, 31); // 31 de diciembre del año actual
            let age = endOfYear.getFullYear() - birthDate.getFullYear();
            const monthDiff = endOfYear.getMonth() - birthDate.getMonth();
            // Ajustamos la edad si el cumpleaños aún no ha ocurrido para el 31 de diciembre
            if (monthDiff < 0 || (monthDiff === 0 && endOfYear.getDate() < birthDate.getDate())) {
                age--;
            }
            const gender = gymnast.gender;
            let category;
            if (gender === 'F') {
                if (age < 6)
                    category = 'Pulga';
                else if (age <= 7)
                    category = 'Pre-mini';
                else if (age <= 9)
                    category = 'Mini';
                else if (age <= 11)
                    category = 'Pre-infantil';
                else if (age <= 13)
                    category = 'Infantil';
                else if (age <= 15)
                    category = 'Juvenil';
                else
                    category = 'Mayor';
            }
            else {
                if (age < 6)
                    category = 'Pre-mini';
                else if (age <= 7)
                    category = 'Mini';
                else if (age <= 9)
                    category = 'Pre-infantil';
                else if (age <= 11)
                    category = 'Infantil';
                else if (age <= 13)
                    category = 'Cadete';
                else if (age <= 15)
                    category = 'Juvenil';
                else if (age <= 17)
                    category = 'Junior';
                else
                    category = 'Mayor';
            }
            return Object.assign(Object.assign({}, gymnast.toObject()), { category });
        });
        res.json(enrichedGymnasts);
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
