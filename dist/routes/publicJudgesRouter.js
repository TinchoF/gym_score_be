"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("./authController"); // Reutilizamos el controlador ya definido
const router = express_1.default.Router();
// Ruta pública para obtener la lista de nombres de jueces
router.get('/', authController_1.getJudgesList);
exports.default = router;
