
import { 
  calculateFinalDeductions, 
  calculateFinalDScore, 
  calculateFinalScore, 
  DEFAULT_LEVEL_SCORING,
  ScoringMethod
} from './scoreCalculator';

describe('Score Calculator System', () => {

  describe('calculateFinalDeductions', () => {
    it('should return null for empty deductions', () => {
      expect(calculateFinalDeductions([])).toBeNull();
    });

    it('should return the single deduction value for 1 judge', () => {
      expect(calculateFinalDeductions([1.5])).toBe(1.5);
    });

    it('should calculate the average for 2 judges', () => {
      // (1.5 + 1.7) / 2 = 1.6
      expect(calculateFinalDeductions([1.5, 1.7])).toBe(1.6);
    });

    it('should calculate the average for 3 judges', () => {
      // (1.5 + 1.7 + 1.6) / 3 = 1.6
      expect(calculateFinalDeductions([1.5, 1.7, 1.6])).toBe(1.6);
    });

    it('should drop min and max and average the rest for 4 judges', () => {
      // 1.0, 1.5, 1.7, 2.0 -> Drop 1.0 & 2.0 -> Avg(1.5, 1.7) = 1.6
      expect(calculateFinalDeductions([1.0, 1.5, 1.7, 2.0])).toBe(1.6);
    });

    it('should drop min and max and average the rest for 5 judges', () => {
      // 1.0, 1.4, 1.6, 1.8, 2.0 -> Drop 1.0 & 2.0 -> Avg(1.4, 1.6, 1.8) = 1.6
      expect(calculateFinalDeductions([1.0, 1.4, 1.6, 1.8, 2.0])).toBe(1.6);
    });
  });

  describe('calculateFinalDScore', () => {
    it('should return null for empty D-Scores', () => {
      expect(calculateFinalDScore([])).toBeNull();
    });

    it('should calculate the average D-Score', () => {
      // (4.5 + 4.7) / 2 = 4.6
      expect(calculateFinalDScore([4.5, 4.7])).toBe(4.6);
    });
  });

  describe('calculateFinalScore - Scenarios', () => {

    test('Method: deductions (Base Score - Deductions)', () => {
      const result = calculateFinalScore('deductions', {
        baseScore: 10,
        deductions: [1.0, 1.2], // Avg: 1.1
      });

      expect(result).not.toBeNull();
      expect(result?.finalDeduction).toBe(1.1);
      expect(result?.finalScore).toBe(8.9); // 10 - 1.1
    });

    test('Method: start_value (Start Value - Deductions)', () => {
      const result = calculateFinalScore('start_value', {
        startValue: 9.5,
        deductions: [0.5, 0.7], // Avg: 0.6
      });

      expect(result).not.toBeNull();
      expect(result?.finalDeduction).toBe(0.6);
      expect(result?.finalScore).toBe(8.9); // 9.5 - 0.6
    });

    test('Method: start_value_bonus (Start Value + Bonus - Deductions)', () => {
      const result = calculateFinalScore('start_value_bonus', {
        startValue: 9.0,
        difficultyBonuses: [0.3, 0.5], // Avg: 0.4
        deductions: [1.0], // 1.0
      });

      expect(result).not.toBeNull();
      expect(result?.difficultyBonus).toBe(0.4);
      expect(result?.finalDeduction).toBe(1.0);
      expect(result?.finalScore).toBe(8.4); // 9.0 + 0.4 - 1.0
    });

    test('Method: fig_code (D-Score + (10 - Deductions))', () => {
      const result = calculateFinalScore('fig_code', {
        dScores: [5.0, 5.0], // Avg: 5.0
        deductions: [1.5, 1.7], // Avg: 1.6
      });

      expect(result).not.toBeNull();
      expect(result?.dScore).toBe(5.0);
      expect(result?.finalDeduction).toBe(1.6);
      expect(result?.eScore).toBe(8.4); // 10 - 1.6
      expect(result?.finalScore).toBe(13.4); // 5.0 + 8.4
    });

    test('Should return null if required inputs are missing', () => {
      const result = calculateFinalScore('start_value', {
        deductions: [1.0],
        // Missing startValue
      });
      expect(result).toBeNull();
    });
  });

  describe('Integration with Default Configurations', () => {
    it('Should verify USAG 1A uses deductions method', () => {
      const config = DEFAULT_LEVEL_SCORING.find(c => c.level === 'USAG 1A');
      expect(config?.scoringMethod).toBe('deductions');
    });

    it('Should verify Junior FIG uses fig_code method', () => {
      const config = DEFAULT_LEVEL_SCORING.find(c => c.level === 'Junior FIG');
      expect(config?.scoringMethod).toBe('fig_code');
    });
  });

});
