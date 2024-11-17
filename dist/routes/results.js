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
const router = express_1.default.Router();
// Get results by group
router.get('/group/:groupId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const results = yield Score_1.default.find({ group: groupId }).populate('gymnast');
        res.json(results);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching results' });
    }
}));
// Submit scores
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gymnastId, apparatus, deductions } = req.body;
        const initialScore = 10;
        const finalScore = initialScore - deductions;
        const score = new Score_1.default({
            gymnast: gymnastId,
            apparatus,
            deductions,
            finalScore,
        });
        yield score.save();
        res.status(201).json(score);
    }
    catch (error) {
        res.status(400).json({ error: 'Error submitting score' });
    }
}));
// Calculate rankings
router.get('/rankings/:groupId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { groupId } = req.params;
        const scores = yield Score_1.default.find({ group: groupId }).populate('gymnast');
        const totals = scores.reduce((acc, score) => {
            const gymnastId = score.gymnast._id.toString(); // Convertir ObjectId a string
            const finalScore = typeof score.finalScore === 'number' ? score.finalScore : 0; // Asegurar número
            acc[gymnastId] = (acc[gymnastId] || 0) + finalScore; // Sumar al acumulador
            return acc;
        }, {});
        const rankings = Object.entries(totals)
            .map(([gymnastId, totalScore]) => ({
            gymnastId,
            totalScore,
        }))
            .sort((a, b) => b.totalScore - a.totalScore);
        res.json(rankings);
    }
    catch (error) {
        res.status(500).json({ error: 'Error calculating rankings' });
    }
}));
exports.default = router;
