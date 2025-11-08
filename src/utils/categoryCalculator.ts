/**
 * Calcula la categoría de un gimnasta basada en su fecha de nacimiento y género
 * La edad se calcula al 31 de diciembre del año actual
 */
export function calculateCategory(birthDate: Date | string, gender: 'F' | 'M'): string {
  const birth = new Date(birthDate);
  const endOfYear = new Date(new Date().getFullYear(), 11, 31); // 31 de diciembre del año actual
  
  let age = endOfYear.getFullYear() - birth.getFullYear();
  const monthDiff = endOfYear.getMonth() - birth.getMonth();
  
  // Ajustar la edad si el cumpleaños aún no ha ocurrido para el 31 de diciembre
  if (monthDiff < 0 || (monthDiff === 0 && endOfYear.getDate() < birth.getDate())) {
    age--;
  }
  
  if (gender === 'F') {
    if (age < 6) return 'Pulga';
    if (age <= 7) return 'Pre-mini';
    if (age <= 9) return 'Mini';
    if (age <= 11) return 'Pre-infantil';
    if (age <= 13) return 'Infantil';
    if (age <= 15) return 'Juvenil';
    return 'Mayor';
  } else {
    if (age < 6) return 'Pre-mini';
    if (age <= 7) return 'Mini';
    if (age <= 9) return 'Pre-infantil';
    if (age <= 11) return 'Infantil';
    if (age <= 13) return 'Cadete';
    if (age <= 15) return 'Juvenil';
    if (age <= 17) return 'Junior';
    return 'Mayor';
  }
}
