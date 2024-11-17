"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const AssignmentSchema = new mongoose_1.default.Schema({
    gender: { type: String, required: true },
    group: { type: Number, required: true },
    level: { type: String, required: true },
    category: { type: String, required: true },
    apparatus: { type: String, required: true },
    schedule: { type: String, required: true },
    judges: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Judge' }],
});
exports.default = mongoose_1.default.model('Assignment', AssignmentSchema);
