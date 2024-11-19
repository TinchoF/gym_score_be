"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const AdminSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
});
// Método para comparar las contraseñas
AdminSchema.methods.comparePassword = function (candidatePassword) {
    return bcryptjs_1.default.compareSync(candidatePassword, this.password);
};
exports.default = mongoose_1.default.model('Admin', AdminSchema);
