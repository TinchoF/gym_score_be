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
const exportToExcel_1 = require("../utils/exportToExcel");
const Gymnast_1 = __importDefault(require("../models/Gymnast"));
const router = express_1.default.Router();
// Export gymnasts to Excel
router.get('/gymnasts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gymnasts = yield Gymnast_1.default.find().populate('tournament').lean(); // Popular el torneo
        const filename = 'gymnasts.xlsx';
        (0, exportToExcel_1.exportGymnastToExcel)(gymnasts, filename); // Generar el archivo Excel
        res.download(filename, () => {
            require('fs').unlinkSync(filename); // Limpiar el archivo después de la descarga
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error exporting gymnasts' });
    }
}));
exports.default = router; // Aquí está el default export
