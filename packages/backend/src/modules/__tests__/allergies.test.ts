import { describe, it, expect } from 'vitest';

describe('Patient Allergy Alerts', () => {
  // Drug class hierarchy for allergy matching
  // Penicillin class includes: amoxicillin, ampicillin, penicillin, etc.
  const DRUG_CLASSES: Record<string, string[]> = {
    'Penicillin': ['penicillin', 'amoxicillin', 'ampicillin', 'amox', 'augmentin'],
    'Sulfa': ['sulfamethoxazole', 'sulfadiazine', 'sulfasalazine', 'bactrim', 'septra'],
    'NSAID': ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac', 'celecoxib'],
    'Opioid': ['morphine', 'codeine', 'tramadol', 'oxycodone'],
  };

  function checkAllergyConflict(drugName: string, patientAllergen: string): boolean {
    const drugLower = drugName.toLowerCase();
    // Direct text match
    if (drugLower.includes(patientAllergen.toLowerCase()) || 
        patientAllergen.toLowerCase().includes(drugLower)) {
      return true;
    }
    // Check drug class membership
    for (const [className, members] of Object.entries(DRUG_CLASSES)) {
      if (patientAllergen.toLowerCase() === className.toLowerCase()) {
        if (members.some(m => drugLower.includes(m))) {
          return true;
        }
      }
      if (members.some(m => drugLower.includes(m)) &&
          members.some(m => patientAllergen.toLowerCase().includes(m))) {
        return true;
      }
    }
    return false;
  }

  const PATIENT_ALLERGIES = [
    { allergen: 'Penicillin', severity: 'severe', reaction: 'Anaphylaxis' },
    { allergen: 'Aspirin', severity: 'moderate', reaction: 'Hives' },
    { allergen: 'Peanuts', severity: 'anaphylaxis', reaction: 'Difficulty breathing' },
  ];

  it('should detect Penicillin allergy when prescribing Amoxicillin', () => {
    // Amoxicillin belongs to Penicillin class
    const hasConflict = PATIENT_ALLERGIES.some(a => 
      checkAllergyConflict('Amoxicillin', a.allergen)
    );
    expect(hasConflict).toBe(true);
  });

  it('should detect Aspirin allergy when prescribing Ibuprofen', () => {
    // Ibuprofen belongs to NSAID class (same as Aspirin)
    const hasConflict = PATIENT_ALLERGIES.some(a => 
      checkAllergyConflict('Ibuprofen', a.allergen)
    );
    expect(hasConflict).toBe(true);
  });

  it('should have no false positives for safe drugs', () => {
    const conflicts = PATIENT_ALLERGIES.filter(a => 
      checkAllergyConflict('Metformin', a.allergen)
    );
    expect(conflicts.length).toBe(0);
  });

  it('should detect severe reactions as anaphylaxis risk', () => {
    const severe = PATIENT_ALLERGIES.filter(a => 
      a.severity === 'severe' || a.severity === 'anaphylaxis'
    );
    expect(severe.length).toBe(2);
    expect(severe.some(a => a.allergen === 'Penicillin')).toBe(true);
    expect(severe.some(a => a.allergen === 'Peanuts')).toBe(true);
  });
});
