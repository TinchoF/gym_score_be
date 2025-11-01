export function calculateFinalDeductions(deductions: number[]): number | null {
  if (!deductions || deductions.length === 0) return null;

  const n = deductions.length;
  if (n === 1) return deductions[0];

  // For 2 or 3 judges: simple average
  if (n === 2 || n === 3) {
    const sum = deductions.reduce((a, b) => a + b, 0);
    return +(sum / n).toFixed(3);
  }

  // For 4 or more: drop highest and lowest, average the rest
  if (n >= 4) {
    const sorted = deductions.slice().sort((a, b) => a - b);
    // remove first (min) and last (max)
    const middle = sorted.slice(1, -1);
    const sum = middle.reduce((a, b) => a + b, 0);
    return +(sum / middle.length).toFixed(3);
  }

  return null;
}

export default { calculateFinalDeductions };
