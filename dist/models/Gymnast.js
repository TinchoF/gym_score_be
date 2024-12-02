"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const GymnastSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    gender: { type: String, required: true },
    birthDate: { type: Date, required: true },
    level: { type: String, required: true },
    group: { type: Number, required: false },
    tournament: { type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Tournament', required: false },
    competitionTime: { type: String, required: false },
    payment: { type: Boolean, required: false },
    coach: { type: String, required: false },
    institution: { type: String, required: false },
});
exports.default = mongoose_1.default.model('Gymnast', GymnastSchema);
