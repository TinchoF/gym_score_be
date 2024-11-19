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
const Config_1 = __importDefault(require("../models/Config"));
const router = express_1.default.Router();
// Obtener configuración actual
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const config = yield Config_1.default.findOne();
        if (!config) {
            // Si no existe configuración, crear una por defecto
            const newConfig = new Config_1.default({
                baseScore: 10,
                tournaments: [],
                groupCount: 0,
            });
            yield newConfig.save();
            return res.json(newConfig);
        }
        res.json(config);
    }
    catch (error) {
        console.error('Error fetching config:', error);
        res.status(500).json({ message: 'Error fetching config' });
    }
}));
// Actualizar configuración
router.put('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { baseScore, tournaments, groupCount } = req.body;
        const config = yield Config_1.default.findOneAndUpdate({}, { baseScore, tournaments, groupCount }, { new: true, upsert: true } // Si no existe, crea uno nuevo
        );
        res.json(config);
    }
    catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ message: 'Error updating config' });
    }
}));
exports.default = router;
