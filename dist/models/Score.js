"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const ScoreSchema = new mongoose_1.default.Schema({
    gymnast: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Gymnast', required: true },
    apparatus: { type: String, required: true },
    tournament: { type: String, required: true },
    deductions: { type: Number, required: true, min: 0, max: 10 },
});
exports.default = mongoose_1.default.model('Score', ScoreSchema);
