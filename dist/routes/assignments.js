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
const Assignment_1 = __importDefault(require("../models/Assignment"));
const Judge_1 = __importDefault(require("../models/Judge"));
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Get all assignments
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assignments = yield Assignment_1.default.find();
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: 'Error fetching assignments' });
    }
}));
// Obtener asignaciones de un juez específico
router.get('/judge/:judgeId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { judgeId } = req.params;
        // Validar que el judgeId sea un ObjectId válido
        if (!mongoose_1.default.Types.ObjectId.isValid(judgeId)) {
            return res.status(400).json({ error: 'ID del juez no válido' });
        }
        // Buscar todas las asignaciones donde el juez esté involucrado
        const assignments = yield Assignment_1.default.find({ judges: new mongoose_1.default.Types.ObjectId(judgeId) });
        res.status(200).json(assignments);
    }
    catch (error) {
        console.error('Error fetching assignments for judge:', error);
        res.status(500).json({ error: 'Error fetching assignments for judge' });
    }
}));
// Eliminar un juez de una asignación
router.delete('/:assignmentId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId } = req.params;
        const { judgeId } = req.query; // Obtener judgeId de la query string
        if (!mongoose_1.default.Types.ObjectId.isValid(judgeId)) {
            return res.status(400).json({ error: 'ID no válido' });
        }
        // Convertir judgeId en un ObjectId válido
        const judgeObjectId = new mongoose_1.default.Types.ObjectId(judgeId);
        // Encontrar la asignación que contiene el juez
        const assignment = yield Assignment_1.default.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        // Verificar si el juez está en la asignación
        const judgeIndex = assignment.judges.indexOf(judgeObjectId);
        if (judgeIndex === -1) {
            return res.status(400).json({ error: 'Judge not assigned to this assignment' });
        }
        // Eliminar el juez del array de jueces
        assignment.judges.splice(judgeIndex, 1);
        yield assignment.save();
        res.status(200).json(assignment); // Devolver la asignación actualizada
    }
    catch (error) {
        console.error('Error removing judge:', error);
        res.status(500).json({ error: 'Error removing judge' });
    }
}));
// Create or update an assignment
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { gender, group, level, category, apparatus, schedule, judges, tournament } = req.body;
        // Verify judges exist
        const existingJudges = yield Judge_1.default.find({ _id: { $in: judges } });
        if (existingJudges.length !== judges.length) {
            return res.status(400).json({ error: 'One or more judges not found' });
        }
        // Check if assignment with the same combination of level, category, apparatus, and schedule already exists
        let existingAssignment = yield Assignment_1.default.findOne({
            gender,
            level,
            category,
            apparatus,
            schedule,
            tournament,
        });
        if (existingAssignment) {
            // If the assignment exists but doesn't contain the judge, add the judge to the array
            const judgeExistsInAssignment = existingAssignment.judges.includes(judges[0]); // Assuming only one judge is being added
            if (!judgeExistsInAssignment) {
                existingAssignment.judges.push(judges[0]);
                yield existingAssignment.save();
                return res.status(200).json(existingAssignment);
            }
            else {
                return res.status(400).json({ error: 'Judge already assigned to this combination' });
            }
        }
        else {
            // If no assignment exists, create a new one
            const newAssignment = new Assignment_1.default({
                gender,
                group,
                level,
                category,
                apparatus,
                schedule,
                judges,
                tournament,
            });
            yield newAssignment.save();
            return res.status(201).json(newAssignment);
        }
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ error: 'Error creating or updating assignment' });
    }
}));
exports.default = router;
