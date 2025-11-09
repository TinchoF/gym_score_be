import mongoose, { Document, Schema } from 'mongoose';

// Interfaz de los datos de configuración
interface IConfig extends Document {
  // Campos globales removidos (ahora van en Tournament)
  // baseScore, groupCount, y tournaments se manejan por torneo
}

// Definir el esquema de la colección de configuración
const configSchema = new Schema<IConfig>({
  // Configuración global reservada para futuras necesidades
}, { timestamps: true });

// Crear y exportar el modelo de Config
const Config = mongoose.model<IConfig>('Config', configSchema);

export default Config;
