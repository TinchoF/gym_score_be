/**
 * Calcula la categoría de un gimnasta basada en su fecha de nacimiento y género
 * Basado en reglamento oficial CAG 2023-2029
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
  
  // Categorías GAF (Gimnasia Artística Femenina) - CAG 2023-2029
  if (gender === 'F') {
    if (age < 6) return 'Pulga';           // No oficial, para escuelitas
    if (age <= 7) return 'Pre-Mini';       // 6-7 años
    if (age <= 9) return 'Mini';           // 8-9 años
    if (age <= 11) return 'Pre-Infantil';  // 10-11 años
    if (age <= 13) return 'Infantil';      // 12-13 años
    if (age <= 15) return 'Juvenil';       // 14-15 años
    return 'Mayor';                         // 16+ años
  } 
  // Categorías GAM (Gimnasia Artística Masculina) - CAG 2020-2024
  else {
    if (age < 6) return 'Pulga';           // No oficial, para escuelitas
    if (age <= 7) return 'Mini';           // hasta 7 años
    if (age <= 9) return 'Menores';        // 8-9 años
    if (age <= 11) return 'Infantiles';    // 10-11 años
    if (age <= 13) return 'Cadetes';       // 12-13 años
    if (age <= 15) return 'Juveniles';     // 14-15 años
    if (age <= 17) return 'Mayores';       // 16-17 años
    return 'Senior';                        // 18+ años
  }
}

