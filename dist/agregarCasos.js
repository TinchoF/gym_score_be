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
const mongoose_1 = __importDefault(require("mongoose"));
const Gymnast_1 = __importDefault(require("./models/Gymnast")); // Importa el modelo correctamente
const firstNames = [
    'Juan', 'Ana', 'Luis', 'Maria', 'Carlos', 'Laura', 'Pedro', 'Marta',
    'Antonio', 'Paula', 'Jose', 'Isabel', 'David', 'Elena', 'Javier', 'Carmen'
];
const lastNames = [
    'Gonzalez', 'Martinez', 'Perez', 'Lopez', 'Sanchez', 'Ramirez',
    'Torres', 'Fernandez', 'Diaz', 'Gomez', 'Hernandez', 'Moreno',
    'Ruiz', 'Jimenez', 'Alvarez', 'Cruz'
];
// Generación de un nombre aleatorio
const generateRandomName = () => {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
};
// Generación de la categoría de un gimnasta basado en su fecha de nacimiento y género
const calculateCategory = (birthDate, gender) => {
    const birthYear = new Date(birthDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;
    if (gender === 'F') {
        if (age < 6)
            return 'Pulga';
        if (age <= 7)
            return 'Pre-mini';
        if (age <= 8)
            return 'Mini';
        if (age <= 11)
            return 'Pre-infantil';
        if (age <= 13)
            return 'Infantil';
        if (age <= 15)
            return 'Juvenil';
        return 'Mayor';
    }
    else {
        if (age < 6)
            return 'Pulga';
        if (age <= 5)
            return 'Pre-mini';
        if (age <= 7)
            return 'Mini';
        if (age <= 9)
            return 'Pre-infantil';
        if (age <= 11)
            return 'Infantil';
        if (age <= 13)
            return 'Cadete';
        if (age <= 15)
            return 'Juvenil';
        if (age <= 17)
            return 'Junior';
        return 'Mayor';
    }
};
// Conectar a la base de datos
mongoose_1.default.connect('mongodb://localhost:27017/gymnastDB')
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Conectado a MongoDB');
    // Generar 50 gimnastas
    for (let i = 0; i < 50; i++) {
        const gender = Math.random() > 0.5 ? 'F' : 'M'; // Aleatorio entre 'F' y 'M'
        const birthDate = new Date(2012 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString();
        const name = generateRandomName();
        const category = calculateCategory(birthDate, gender);
        const level = ['E1', 'E2', 'E3', 'Pulga', 'Avanzado', 'Elite'][Math.floor(Math.random() * 6)];
        const competitionTime = ['10:00', '10:30', '11:00', '11:30'][Math.floor(Math.random() * 4)];
        const coach = ['Tincho', 'Pepe', 'Flor'][Math.floor(Math.random() * 3)];
        const institution = ['CEF', 'Club 1', 'Club 2'][Math.floor(Math.random() * 3)];
        const group = Math.floor(Math.random() * 4) + 1;
        // Crear un nuevo gimnasta
        const gymnast = new Gymnast_1.default({
            name,
            gender,
            birthDate,
            level,
            category,
            competitionTime,
            coach,
            institution,
            group,
            payment: true // Siempre es true en este caso
        });
        yield gymnast.save();
        console.log(`Gimnasta ${name} agregado`);
    }
}))
    .catch((error) => {
    console.error('Error al conectar con MongoDB:', error);
});
