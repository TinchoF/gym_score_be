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
const Admin_1 = __importDefault(require("../models/Admin"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const router = express_1.default.Router();
// Get all admins
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const admins = yield Admin_1.default.find();
        res.json(admins);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching admins' });
    }
}));
// Create an admin
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password } = req.body;
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const newAdmin = new Admin_1.default({ username, password: hashedPassword });
        yield newAdmin.save();
        res.status(201).json(newAdmin);
    }
    catch (error) {
        res.status(400).json({ error: 'Error creating admin' });
    }
}));
// Delete an admin
router.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield Admin_1.default.findByIdAndDelete(id);
        res.status(204).send();
    }
    catch (error) {
        res.status(500).json({ error: 'Error deleting admin' });
    }
}));
exports.default = router;
