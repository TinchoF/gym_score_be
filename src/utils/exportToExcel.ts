import * as XLSX from 'xlsx';

export const exportGymnastToExcel = (data: any[], filename: string) => {
  // Transformar los datos para incluir encabezados en castellano y modificar campos
  const transformedData = data.map(gymnast => ({
    Nombre: gymnast.name,
    Género: gymnast.gender,
    'Fecha de Nacimiento': new Date(gymnast.birthDate).toLocaleDateString('es-ES'),
    Nivel: gymnast.level,
    Categoría: gymnast.category,
    Grupo: gymnast.group || '',
    Torneo: gymnast.tournament?.name || '',
    'Turno': gymnast.turno || '',
    Pago: gymnast.payment ? 'Sí' : 'No',
    Entrenador: gymnast.coach || '',
    Institución: gymnast.institution || '',
  }));

  // Crear la hoja de cálculo con los datos transformados
  const worksheet = XLSX.utils.json_to_sheet(transformedData);

  // Agregar estilos al encabezado
  const range = XLSX.utils.decode_range(worksheet['!ref']!);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Fila 0, columna col
    if (!worksheet[cellAddress]) continue;
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
    { wch: 25 }, // Turno
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
