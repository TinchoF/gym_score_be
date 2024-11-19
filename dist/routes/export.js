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
const Score_1 = __importDefault(require("../models/Score"));
const Assignment_1 = __importDefault(require("../models/Assignment"));
const router = express_1.default.Router();
// Export gymnasts to Excel
router.get('/gymnasts', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const gymnasts = yield Gymnast_1.default.find().lean();
        const filename = 'gymnasts.xlsx';
        (0, exportToExcel_1.exportToExcel)(gymnasts, filename);
        res.download(filename, () => {
            require('fs').unlinkSync(filename); // Cleanup after download
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error exporting gymnasts' });
    }
}));
// Export rankings to Excel
router.get('/rankings', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const scores = yield Score_1.default.find().populate('gymnast').lean();
        const data = scores.map((score) => ({
            Gymnast: score.gymnast.name,
            Apparatus: score.apparatus,
            Deductions: score.deductions,
        }));
        const filename = 'rankings.xlsx';
        (0, exportToExcel_1.exportToExcel)(data, filename);
        res.download(filename, () => {
            require('fs').unlinkSync(filename); // Clean up file after download
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error exporting rankings' });
    }
}));
// Export assignments to Excel
router.get('/assignments', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield Assignment_1.default.find().populate('judges').lean();
        const data = assignments.map((assignment) => ({
            Group: assignment.group,
            Level: assignment.level,
            Category: assignment.category,
            Apparatus: assignment.apparatus,
            Schedule: assignment.schedule,
            Judges: assignment.judges.map((judge) => judge.name).join(', '),
        }));
        const filename = 'assignments.xlsx';
        (0, exportToExcel_1.exportToExcel)(data, filename);
        res.download(filename, () => {
            require('fs').unlinkSync(filename); // Clean up file after download
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Error exporting assignments' });
    }
}));
exports.default = router; // Aquí está el default export
