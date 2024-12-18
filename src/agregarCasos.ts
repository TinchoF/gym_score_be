import mongoose from 'mongoose';
import Gymnast from './models/Gymnast'; // Importa el modelo correctamente

const firstNames: string[] = [
  'Andrés', 'Beatriz', 'Carlos', 'Diana', 'Eduardo', 'Felicia', 'Gabriel', 'Helena', 
  'Ignacio', 'Juliana', 'Karla', 'Luis', 'Marta', 'Nicolás', 'Olga', 'Pablo'
];

const lastNames: string[] = [
  'Martín', 'Lozano', 'Vega', 'Castro', 'Silva', 'Pérez', 'Mendez', 'Morales', 
  'Figueroa', 'Serrano', 'Ramos', 'Navarro', 'García', 'López', 'Castilla', 'Hidalgo'
];

// Generación de un nombre aleatorio
const generateRandomName = (): string => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
};

// Generación de la categoría de un gimnasta basado en su fecha de nacimiento y género
const calculateCategory = (birthDate: string, gender: string): string => {
  const birthYear = new Date(birthDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  if (gender === 'F') {
    if (age < 6) return 'Pulga';
    if (age <= 7) return 'Pre-mini';
    if (age <= 8) return 'Mini';
    if (age <= 11) return 'Pre-infantil';
    if (age <= 13) return 'Infantil';
    if (age <= 15) return 'Juvenil';
    return 'Mayor';
  } else {
    if (age < 6) return 'Pulga';
    if (age <= 5) return 'Pre-mini';
    if (age <= 7) return 'Mini';
    if (age <= 9) return 'Pre-infantil';
    if (age <= 11) return 'Infantil';
    if (age <= 13) return 'Cadete';
    if (age <= 15) return 'Juvenil';
    if (age <= 17) return 'Junior';
    return 'Mayor';
  }
};

// Conectar a la base de datos
mongoose.connect('mongodb://localhost:27017/gym_score')
  .then(async () => {
    console.log('Conectado a MongoDB');
    
    // Generar 50 gimnastas
    for (let i = 0; i < 50; i++) {
      const gender = 'F'; // Aleatorio entre 'F' y 'M'
      const birthDate = new Date("2017-01-01").toISOString();
      const name = generateRandomName();
      const category = calculateCategory(birthDate, gender);
      const level = 'E1';
      const competitionTime = '11:00';
      const coach ='Tincho';
      const institution = "cef";
      const group = 2

      // Crear un nuevo gimnasta
      const gymnast = new Gymnast({
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

      await gymnast.save();
    }
  })
  .catch((error) => {
    console.error('Error al conectar con MongoDB:', error);
  });
