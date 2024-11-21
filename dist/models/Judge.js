"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const JudgeSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    aparatus: { type: [String], required: true, default: [] },
    password: { type: String, required: true },
});
exports.default = mongoose_1.default.model('Judge', JudgeSchema);
