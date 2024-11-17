"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const router = express_1.default.Router();
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'judge', password: 'judge123', role: 'judge' },
];
// Login Route
router.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jsonwebtoken_1.default.sign({ username: user.username, role: user.role }, process.env.JWT_SECRET || '', {
        expiresIn: '1h',
    });
    res.json({ token });
});
exports.default = router;
