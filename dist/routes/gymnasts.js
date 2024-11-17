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
const router = express_1.default.Router();
// Get all gymnasts with optional filters
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { level, category, group } = req.query;
        const filters = {};
        if (level)
            filters.level = level;
        if (category)
            filters.category = category;
        if (group)
            filters.group = group;
        const gymnasts = yield Gymnast_1.default.find(filters);
        res.json(gymnasts);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching gymnasts' });
    }
}));
// Create a gymnast
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Eliminar _id del body antes de crear el nuevo objeto
        const _a = req.body, { _id } = _a, gymnastData = __rest(_a, ["_id"]);
        // Crear una nueva instancia del modelo sin el _id
        const newGymnast = new Gymnast_1.default(gymnastData);
        yield newGymnast.save();
        res.status(201).json(newGymnast);
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ error: 'Error creating gymnast' });
    }
}));
// Update a gymnast
// Actualiza la ruta PUT para que espere el ID en la URL
router.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params; // Obtener el ID de los parámetros de la URL
        console.log('body', req.body); // Verificar el cuerpo de la solicitud
        console.log('ID: ', id); // Asegurarse de que el ID se pasa correctamente
        // Valida y convierte el ID a ObjectId
        if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'ID no válido' });
        }
        // Actualiza el gimnasta con el ID en la URL
        const updatedGymnast = yield Gymnast_1.default.findByIdAndUpdate(id, req.body, { new: true });
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
