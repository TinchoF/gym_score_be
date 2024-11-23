"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportGymnastToExcel = void 0;
const XLSX = __importStar(require("xlsx"));
const exportGymnastToExcel = (data, filename) => {
    // Transformar los datos para incluir encabezados en castellano y modificar campos
    const transformedData = data.map(gymnast => {
        var _a;
        return ({
            Nombre: gymnast.name,
            Género: gymnast.gender,
            'Fecha de Nacimiento': new Date(gymnast.birthDate).toLocaleDateString('es-ES'),
            Nivel: gymnast.level,
            Categoría: gymnast.category,
            Grupo: gymnast.group || '',
            Torneo: ((_a = gymnast.tournament) === null || _a === void 0 ? void 0 : _a.name) || '',
            'Horario de Competencia': gymnast.competitionTime || '',
            Pago: gymnast.payment ? 'Sí' : 'No',
            Entrenador: gymnast.coach || '',
            Institución: gymnast.institution || '',
        });
    });
    // Crear la hoja de cálculo con los datos transformados
    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    // Agregar estilos al encabezado
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Fila 0, columna col
        if (!worksheet[cellAddress])
            continue;
        worksheet[cellAddress].s = {
            font: { bold: true }, // Negrita
            fill: { fgColor: { rgb: 'FFFF00' } }, // Fondo amarillo
            alignment: { horizontal: 'center', vertical: 'center' }, // Centrado
        };
    }
    // Establecer ancho de columnas
    worksheet['!cols'] = [
        { wch: 20 }, // Nombre
        { wch: 10 }, // Género
        { wch: 15 }, // Fecha de Nacimiento
        { wch: 10 }, // Nivel
        { wch: 15 }, // Categoría
        { wch: 10 }, // Grupo
        { wch: 20 }, // Torneo
        { wch: 25 }, // Horario de Competencia
        { wch: 10 }, // Pago
        { wch: 20 }, // Entrenador
        { wch: 20 }, // Institución
    ];
    // Crear el libro de trabajo y agregar la hoja
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gimnastas');
    // Escribir el archivo Excel
    XLSX.writeFile(workbook, filename);
};
exports.exportGymnastToExcel = exportGymnastToExcel;
