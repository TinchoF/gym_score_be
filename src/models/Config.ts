import mongoose, { Document, Schema } from 'mongoose';

// Interfaz de los datos de configuración
interface IConfig extends Document {
  baseScore: number;
  tournaments: string[];
  groupCount: number;
}

// Definir el esquema de la colección de configuración
const configSchema = new Schema<IConfig>({
  baseScore: { type: Number, required: true, default: 10 },
  tournaments: { type: [String], required: true, default: [] },
  groupCount: { type: Number, required: true, default: 0 },
}, { timestamps: true });

// Crear y exportar el modelo de Config
const Config = mongoose.model<IConfig>('Config', configSchema);

export default Config;
