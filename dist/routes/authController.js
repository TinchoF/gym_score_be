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
exports.getJudgesList = void 0;
const Judge_1 = __importDefault(require("../models/Judge")); // Ruta a tu modelo Judge
// Endpoint para obtener la lista de jueces
const getJudgesList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Proyección para devolver solo el campo 'name'
        const judges = yield Judge_1.default.find({}, { name: 1, _id: 1 });
        res.json(judges); // Retorna la lista de jueces con solo sus nombres
    }
    catch (error) {
        console.error('Error fetching judges list:', error);
        res.status(500).json({ error: 'Error fetching judges list' });
    }
});
exports.getJudgesList = getJudgesList;
