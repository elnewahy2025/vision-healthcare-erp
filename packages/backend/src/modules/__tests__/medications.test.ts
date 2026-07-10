import { describe, it, expect } from 'vitest';

const MEDICATIONS = [
  { genericName: 'Paracetamol', category: 'Analgesic', route: 'oral', strengths: ['500mg', '1000mg'] },
  { genericName: 'Ibuprofen', category: 'NSAID', route: 'oral', strengths: ['200mg', '400mg', '600mg'] },
  { genericName: 'Amoxicillin', category: 'Antibiotic', route: 'oral', strengths: ['250mg', '500mg'] },
  { genericName: 'Metformin', category: 'Antidiabetic', route: 'oral', strengths: ['500mg', '850mg', '1000mg'] },
  { genericName: 'Atorvastatin', category: 'Statin', route: 'oral', strengths: ['10mg', '20mg', '40mg', '80mg'] },
  { genericName: 'Salbutamol', category: 'Bronchodilator', route: 'inhalation', strengths: ['100mcg/dose'] },
  { genericName: 'Insulin Glargine', category: 'Antidiabetic', route: 'subcutaneous', strengths: ['100U/mL'] },
];

describe('Medication Database', () => {
  it('should have all required fields', () => {
    for (const med of MEDICATIONS) {
      expect(med.genericName).toBeTruthy();
      expect(med.category).toBeTruthy();
      expect(med.route).toBeTruthy();
      expect(med.strengths.length).toBeGreaterThan(0);
    }
  });

  it('should support search by generic name', () => {
    const query = 'amox';
    const results = MEDICATIONS.filter(m => 
      m.genericName.toLowerCase().includes(query.toLowerCase())
    );
    expect(results.length).toBe(1);
    expect(results[0].genericName).toBe('Amoxicillin');
  });

  it('should support filtering by category', () => {
    const antidiabetics = MEDICATIONS.filter(m => m.category === 'Antidiabetic');
    expect(antidiabetics.length).toBe(2);
    expect(antidiabetics.map(m => m.genericName)).toContain('Metformin');
    expect(antidiabetics.map(m => m.genericName)).toContain('Insulin Glargine');
  });

  it('should have unique generic names', () => {
    const names = MEDICATIONS.map(m => m.genericName);
    expect(new Set(names).size).toBe(names.length);
  });

  it('should handle empty search gracefully', () => {
    const query = 'zzzznonexistent';
    const results = MEDICATIONS.filter(m => 
      m.genericName.toLowerCase().includes(query)
    );
    expect(results.length).toBe(0);
  });
});
