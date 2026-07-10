import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Patient allergies
  await knex.schema.createTable('patient_allergies', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('patient_id').references('id').inTable('patients').onDelete('CASCADE');
    table.string('allergen', 255).notNullable();
    table.string('severity', 20).defaultTo('moderate'); // mild, moderate, severe, anaphylaxis
    table.string('reaction', 255).nullable();
    table.text('notes').nullable();
    table.uuid('recorded_by').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['patient_id']);
  });

  // Medication database
  await knex.schema.createTable('medication_database', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('generic_name', 255).notNullable();
    table.string('brand_names', 500).nullable();
    table.string('category', 100).nullable();
    table.string('route', 50).nullable(); // oral, topical, IV, IM, etc.
    table.string('dosage_form', 100).nullable();
    table.string('strength', 100).nullable();
    table.text('indications').nullable();
    table.text('contraindications').nullable();
    table.text('side_effects').nullable();
    table.text('interactions').nullable();
    table.string('status', 20).defaultTo('active');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['generic_name']);
    table.index(['category']);
  });

  // ICD-10 Codes
  await knex.schema.createTable('icd10_codes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('code', 10).notNullable().unique();
    table.string('category', 10).nullable();
    table.string('description', 500).notNullable();
    table.text('full_description').nullable();
    table.boolean('is_chronic').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['code']);
    table.index(['description']);
  });

  // Seed common ICD-10 codes
  const icd10Codes = [
    { code: 'A00', category: 'A00-A09', description: 'Cholera', is_chronic: false },
    { code: 'A09', category: 'A00-A09', description: 'Infectious gastroenteritis', is_chronic: false },
    { code: 'A15', category: 'A15-A19', description: 'Respiratory tuberculosis', is_chronic: true },
    { code: 'B00', category: 'B00-B09', description: 'Herpesviral infections', is_chronic: false },
    { code: 'B20', category: 'B20-B24', description: 'HIV disease', is_chronic: true },
    { code: 'C00', category: 'C00-C14', description: 'Malignant neoplasm of lip', is_chronic: true },
    { code: 'C16', category: 'C15-C26', description: 'Malignant neoplasm of stomach', is_chronic: true },
    { code: 'C18', category: 'C15-C26', description: 'Malignant neoplasm of colon', is_chronic: true },
    { code: 'C34', category: 'C30-C39', description: 'Malignant neoplasm of bronchus/lung', is_chronic: true },
    { code: 'C50', category: 'C50-C50', description: 'Malignant neoplasm of breast', is_chronic: true },
    { code: 'C61', category: 'C60-C63', description: 'Malignant neoplasm of prostate', is_chronic: true },
    { code: 'D50', category: 'D50-D53', description: 'Iron deficiency anemia', is_chronic: true },
    { code: 'E00', category: 'E00-E07', description: 'Congenital iodine-deficiency syndrome', is_chronic: true },
    { code: 'E03', category: 'E00-E07', description: 'Other hypothyroidism', is_chronic: true },
    { code: 'E05', category: 'E00-E07', description: 'Thyrotoxicosis', is_chronic: true },
    { code: 'E07', category: 'E00-E07', description: 'Other disorders of thyroid', is_chronic: true },
    { code: 'E10', category: 'E10-E14', description: 'Type 1 diabetes mellitus', is_chronic: true },
    { code: 'E11', category: 'E10-E14', description: 'Type 2 diabetes mellitus', is_chronic: true },
    { code: 'E14', category: 'E10-E14', description: 'Unspecified diabetes mellitus', is_chronic: true },
    { code: 'E66', category: 'E65-E68', description: 'Obesity', is_chronic: true },
    { code: 'E78', category: 'E70-E88', description: 'Hyperlipidemia', is_chronic: true },
    { code: 'E86', category: 'E70-E88', description: 'Volume depletion', is_chronic: false },
    { code: 'E87', category: 'E70-E88', description: 'Electrolyte imbalance', is_chronic: false },
    { code: 'F32', category: 'F30-F39', description: 'Major depressive disorder, single episode', is_chronic: true },
    { code: 'F33', category: 'F30-F39', description: 'Major depressive disorder, recurrent', is_chronic: true },
    { code: 'F41', category: 'F40-F48', description: 'Anxiety disorders', is_chronic: true },
    { code: 'G40', category: 'G40-G47', description: 'Epilepsy', is_chronic: true },
    { code: 'G43', category: 'G40-G47', description: 'Migraine', is_chronic: true },
    { code: 'G47', category: 'G40-G47', description: 'Sleep disorders', is_chronic: true },
    { code: 'H25', category: 'H25-H28', description: 'Age-related cataract', is_chronic: true },
    { code: 'H40', category: 'H40-H42', description: 'Glaucoma', is_chronic: true },
    { code: 'H81', category: 'H80-H83', description: 'Meniere disease', is_chronic: true },
    { code: 'I10', category: 'I10-I16', description: 'Essential hypertension', is_chronic: true },
    { code: 'I11', category: 'I10-I16', description: 'Hypertensive heart disease', is_chronic: true },
    { code: 'I15', category: 'I10-I16', description: 'Secondary hypertension', is_chronic: true },
    { code: 'I20', category: 'I20-I25', description: 'Angina pectoris', is_chronic: true },
    { code: 'I21', category: 'I20-I25', description: 'Acute myocardial infarction', is_chronic: true },
    { code: 'I25', category: 'I20-I25', description: 'Chronic ischemic heart disease', is_chronic: true },
    { code: 'I48', category: 'I30-I52', description: 'Atrial fibrillation', is_chronic: true },
    { code: 'I50', category: 'I30-I52', description: 'Heart failure', is_chronic: true },
    { code: 'I64', category: 'I60-I69', description: 'Stroke, not specified', is_chronic: true },
    { code: 'I70', category: 'I70-I79', description: 'Atherosclerosis', is_chronic: true },
    { code: 'J01', category: 'J00-J06', description: 'Acute sinusitis', is_chronic: false },
    { code: 'J02', category: 'J00-J06', description: 'Acute pharyngitis', is_chronic: false },
    { code: 'J03', category: 'J00-J06', description: 'Acute tonsillitis', is_chronic: false },
    { code: 'J04', category: 'J00-J06', description: 'Acute laryngitis', is_chronic: false },
    { code: 'J06', category: 'J00-J06', description: 'Acute upper respiratory infection', is_chronic: false },
    { code: 'J15', category: 'J09-J18', description: 'Bacterial pneumonia', is_chronic: false },
    { code: 'J18', category: 'J09-J18', description: 'Pneumonia, unspecified organism', is_chronic: false },
    { code: 'J20', category: 'J20-J22', description: 'Acute bronchitis', is_chronic: false },
    { code: 'J30', category: 'J30-J39', description: 'Allergic rhinitis', is_chronic: true },
    { code: 'J32', category: 'J30-J39', description: 'Chronic sinusitis', is_chronic: true },
    { code: 'J44', category: 'J40-J47', description: 'Chronic obstructive pulmonary disease', is_chronic: true },
    { code: 'J45', category: 'J40-J47', description: 'Asthma', is_chronic: true },
    { code: 'K21', category: 'K20-K31', description: 'Gastro-esophageal reflux disease', is_chronic: true },
    { code: 'K25', category: 'K20-K31', description: 'Gastric ulcer', is_chronic: true },
    { code: 'K29', category: 'K20-K31', description: 'Gastritis', is_chronic: true },
    { code: 'K30', category: 'K20-K31', description: 'Functional dyspepsia', is_chronic: true },
    { code: 'K35', category: 'K35-K38', description: 'Acute appendicitis', is_chronic: false },
    { code: 'K40', category: 'K40-K46', description: 'Inguinal hernia', is_chronic: true },
    { code: 'K56', category: 'K55-K64', description: 'Paralytic ileus', is_chronic: false },
    { code: 'K57', category: 'K55-K64', description: 'Diverticulitis', is_chronic: true },
    { code: 'K59', category: 'K55-K64', description: 'Constipation', is_chronic: true },
    { code: 'K70', category: 'K70-K77', description: 'Alcoholic liver disease', is_chronic: true },
    { code: 'K74', category: 'K70-K77', description: 'Hepatic fibrosis', is_chronic: true },
    { code: 'K76', category: 'K70-K77', description: 'Other liver diseases', is_chronic: true },
    { code: 'K80', category: 'K80-K87', description: 'Cholelithiasis', is_chronic: true },
    { code: 'L01', category: 'L00-L08', description: 'Impetigo', is_chronic: false },
    { code: 'L03', category: 'L00-L08', description: 'Cellulitis', is_chronic: false },
    { code: 'L20', category: 'L20-L30', description: 'Atopic dermatitis', is_chronic: true },
    { code: 'L23', category: 'L20-L30', description: 'Allergic contact dermatitis', is_chronic: false },
    { code: 'L30', category: 'L20-L30', description: 'Other dermatitis', is_chronic: true },
    { code: 'L40', category: 'L40-L45', description: 'Psoriasis', is_chronic: true },
    { code: 'L89', category: 'L89-L89', description: 'Pressure ulcer', is_chronic: true },
    { code: 'L97', category: 'L95-L99', description: 'Non-pressure chronic ulcer', is_chronic: true },
    { code: 'M05', category: 'M05-M14', description: 'Rheumatoid arthritis', is_chronic: true },
    { code: 'M10', category: 'M05-M14', description: 'Gout', is_chronic: true },
    { code: 'M15', category: 'M15-M19', description: 'Osteoarthritis', is_chronic: true },
    { code: 'M17', category: 'M15-M19', description: 'Osteoarthritis of knee', is_chronic: true },
    { code: 'M25', category: 'M20-M25', description: 'Joint pain', is_chronic: true },
    { code: 'M40', category: 'M40-M43', description: 'Kyphosis', is_chronic: true },
    { code: 'M45', category: 'M45-M49', description: 'Ankylosing spondylitis', is_chronic: true },
    { code: 'M48', category: 'M45-M49', description: 'Spinal stenosis', is_chronic: true },
    { code: 'M51', category: 'M50-M54', description: 'Lumbar disc disease', is_chronic: true },
    { code: 'M54', category: 'M50-M54', description: 'Dorsalgia (back pain)', is_chronic: true },
    { code: 'M75', category: 'M70-M79', description: 'Shoulder lesions', is_chronic: true },
    { code: 'M79', category: 'M70-M79', description: 'Myalgia', is_chronic: false },
    { code: 'M81', category: 'M80-M85', description: 'Osteoporosis', is_chronic: true },
    { code: 'N17', category: 'N17-N19', description: 'Acute kidney failure', is_chronic: true },
    { code: 'N18', category: 'N17-N19', description: 'Chronic kidney disease', is_chronic: true },
    { code: 'N19', category: 'N17-N19', description: 'Unspecified kidney failure', is_chronic: true },
    { code: 'N20', category: 'N20-N23', description: 'Kidney stone', is_chronic: false },
    { code: 'N30', category: 'N30-N39', description: 'Cystitis', is_chronic: false },
    { code: 'N39', category: 'N30-N39', description: 'Urinary tract infection', is_chronic: false },
    { code: 'N40', category: 'N40-N53', description: 'Enlarged prostate', is_chronic: true },
    { code: 'N80', category: 'N80-N98', description: 'Endometriosis', is_chronic: true },
    { code: 'N95', category: 'N95-N99', description: 'Menopausal disorders', is_chronic: false },
    { code: 'O13', category: 'O10-O16', description: 'Gestational hypertension', is_chronic: false },
    { code: 'O24', category: 'O20-O29', description: 'Gestational diabetes', is_chronic: false },
    { code: 'O80', category: 'O80-O84', description: 'Single spontaneous delivery', is_chronic: false },
    { code: 'P07', category: 'P05-P08', description: 'Low birth weight newborn', is_chronic: false },
    { code: 'P22', category: 'P20-P29', description: 'Respiratory distress of newborn', is_chronic: false },
    { code: 'R05', category: 'R00-R09', description: 'Cough', is_chronic: false },
    { code: 'R06', category: 'R00-R09', description: 'Dyspnea', is_chronic: false },
    { code: 'R07', category: 'R00-R09', description: 'Pain in throat', is_chronic: false },
    { code: 'R10', category: 'R10-R19', description: 'Abdominal pain', is_chronic: false },
    { code: 'R11', category: 'R10-R19', description: 'Nausea and vomiting', is_chronic: false },
    { code: 'R30', category: 'R30-R39', description: 'Painful urination', is_chronic: false },
    { code: 'R31', category: 'R30-R39', description: 'Hematuria', is_chronic: false },
    { code: 'R33', category: 'R30-R39', description: 'Retention of urine', is_chronic: false },
    { code: 'R42', category: 'R40-R46', description: 'Dizziness and giddiness', is_chronic: false },
    { code: 'R50', category: 'R50-R69', description: 'Fever', is_chronic: false },
    { code: 'R51', category: 'R50-R69', description: 'Headache', is_chronic: false },
    { code: 'R52', category: 'R50-R69', description: 'Pain, unspecified', is_chronic: false },
    { code: 'R55', category: 'R50-R69', description: 'Syncope and collapse', is_chronic: false },
    { code: 'R56', category: 'R50-R69', description: 'Convulsions', is_chronic: false },
    { code: 'R60', category: 'R50-R69', description: 'Edema', is_chronic: false },
    { code: 'R63', category: 'R50-R69', description: 'Weight loss', is_chronic: false },
    { code: 'R64', category: 'R50-R69', description: 'Cachexia', is_chronic: false },
    { code: 'R73', category: 'R70-R79', description: 'Elevated blood glucose', is_chronic: false },
    { code: 'R74', category: 'R70-R79', description: 'Abnormal liver enzymes', is_chronic: false },
    { code: 'R79', category: 'R70-R79', description: 'Other abnormal blood chemistry', is_chronic: false },
    { code: 'R80', category: 'R80-R82', description: 'Proteinuria', is_chronic: false },
    { code: 'R82', category: 'R80-R82', description: 'Other urine abnormality', is_chronic: false },
    { code: 'R91', category: 'R90-R94', description: 'Abnormal lung imaging', is_chronic: false },
    { code: 'R92', category: 'R90-R94', description: 'Abnormal breast imaging', is_chronic: false },
    { code: 'S00', category: 'S00-S09', description: 'Superficial injury of head', is_chronic: false },
    { code: 'S01', category: 'S00-S09', description: 'Open wound of head', is_chronic: false },
    { code: 'S06', category: 'S00-S09', description: 'Intracranial injury', is_chronic: true },
    { code: 'S22', category: 'S20-S29', description: 'Fracture of rib', is_chronic: false },
    { code: 'S32', category: 'S30-S39', description: 'Fracture of lumbar spine', is_chronic: false },
    { code: 'S42', category: 'S40-S49', description: 'Fracture of shoulder/upper arm', is_chronic: false },
    { code: 'S52', category: 'S50-S59', description: 'Fracture of forearm', is_chronic: false },
    { code: 'S62', category: 'S60-S69', description: 'Fracture of wrist/hand', is_chronic: false },
    { code: 'S72', category: 'S70-S79', description: 'Fracture of femur', is_chronic: false },
    { code: 'S82', category: 'S80-S89', description: 'Fracture of lower leg', is_chronic: false },
    { code: 'S92', category: 'S90-S99', description: 'Fracture of foot', is_chronic: false },
    { code: 'T14', category: 'T14-T14', description: 'Superficial injury of unspecified body', is_chronic: false },
    { code: 'T20', category: 'T20-T32', description: 'Burn of head and neck', is_chronic: false },
    { code: 'T30', category: 'T20-T32', description: 'Burn, unspecified', is_chronic: false },
    { code: 'T40', category: 'T36-T50', description: 'Poisoning by narcotics', is_chronic: false },
    { code: 'T41', category: 'T36-T50', description: 'Poisoning by anesthetics', is_chronic: false },
    { code: 'T42', category: 'T36-T50', description: 'Poisoning by antiepileptic drugs', is_chronic: false },
    { code: 'T43', category: 'T36-T50', description: 'Poisoning by psychotropic drugs', is_chronic: false },
    { code: 'T44', category: 'T36-T50', description: 'Poisoning by autonomic drugs', is_chronic: false },
    { code: 'T45', category: 'T36-T50', description: 'Poisoning by systemic agents', is_chronic: false },
    { code: 'T46', category: 'T36-T50', description: 'Poisoning by cardiovascular drugs', is_chronic: false },
    { code: 'T47', category: 'T36-T50', description: 'Poisoning by GI drugs', is_chronic: false },
    { code: 'T48', category: 'T36-T50', description: 'Poisoning by respiratory drugs', is_chronic: false },
    { code: 'T49', category: 'T36-T50', description: 'Poisoning by topical drugs', is_chronic: false },
    { code: 'T50', category: 'T36-T50', description: 'Poisoning by other drugs', is_chronic: false },
    { code: 'T78', category: 'T78-T78', description: 'Allergic reaction, unspecified', is_chronic: false },
    { code: 'T78.0', category: 'T78-T78', description: 'Anaphylactic shock', is_chronic: false },
    { code: 'T78.1', category: 'T78-T78', description: 'Other adverse food reactions', is_chronic: true },
    { code: 'T78.2', category: 'T78-T78', description: 'Anaphylactic shock, unspecified', is_chronic: false },
    { code: 'T78.3', category: 'T78-T78', description: 'Angioneurotic edema', is_chronic: true },
    { code: 'T78.4', category: 'T78-T78', description: 'Allergy, unspecified', is_chronic: true },
    { code: 'U07.1', category: 'U00-U49', description: 'COVID-19, virus identified', is_chronic: false },
    { code: 'U07.2', category: 'U00-U49', description: 'COVID-19, virus not identified', is_chronic: false },
    { code: 'U08', category: 'U00-U49', description: 'Personal history of COVID-19', is_chronic: true },
    { code: 'U09', category: 'U00-U49', description: 'Post-COVID condition', is_chronic: true },
    { code: 'Z00', category: 'Z00-Z13', description: 'General medical examination', is_chronic: false },
    { code: 'Z01', category: 'Z00-Z13', description: 'Other special examination', is_chronic: false },
    { code: 'Z03', category: 'Z00-Z13', description: 'Observation for suspected condition', is_chronic: false },
    { code: 'Z11', category: 'Z00-Z13', description: 'Screening for infectious diseases', is_chronic: false },
    { code: 'Z12', category: 'Z00-Z13', description: 'Screening for malignant neoplasms', is_chronic: false },
    { code: 'Z20', category: 'Z20-Z28', description: 'Contact with infectious disease', is_chronic: false },
    { code: 'Z22', category: 'Z20-Z28', description: 'Carrier of infectious disease', is_chronic: true },
    { code: 'Z23', category: 'Z20-Z28', description: 'Need for immunization', is_chronic: false },
    { code: 'Z30', category: 'Z30-Z39', description: 'Contraceptive management', is_chronic: false },
    { code: 'Z32', category: 'Z30-Z39', description: 'Pregnancy test', is_chronic: false },
    { code: 'Z33', category: 'Z30-Z39', description: 'Pregnant state', is_chronic: false },
    { code: 'Z34', category: 'Z30-Z39', description: 'Supervision of normal pregnancy', is_chronic: false },
    { code: 'Z36', category: 'Z30-Z39', description: 'Prenatal screening', is_chronic: false },
    { code: 'Z37', category: 'Z30-Z39', description: 'Outcome of delivery', is_chronic: false },
    { code: 'Z41', category: 'Z40-Z54', description: 'Procedures for other purposes', is_chronic: false },
    { code: 'Z42', category: 'Z40-Z54', description: 'Follow-up after surgery', is_chronic: false },
    { code: 'Z43', category: 'Z40-Z54', description: 'Attention to artificial openings', is_chronic: true },
    { code: 'Z45', category: 'Z40-Z54', description: 'Adjustment of implanted device', is_chronic: false },
    { code: 'Z48', category: 'Z40-Z54', description: 'Post-surgical follow-up', is_chronic: false },
    { code: 'Z50', category: 'Z40-Z54', description: 'Rehabilitation care', is_chronic: true },
    { code: 'Z51', category: 'Z40-Z54', description: 'Other medical care', is_chronic: true },
    { code: 'Z53', category: 'Z40-Z54', description: 'Procedure not carried out', is_chronic: false },
    { code: 'Z71', category: 'Z70-Z76', description: 'Medical counseling', is_chronic: false },
    { code: 'Z72', category: 'Z70-Z76', description: 'Lifestyle problems', is_chronic: true },
    { code: 'Z73', category: 'Z70-Z76', description: 'Burn-out / stress', is_chronic: true },
    { code: 'Z74', category: 'Z70-Z76', description: 'Reduced mobility', is_chronic: true },
    { code: 'Z75', category: 'Z70-Z76', description: 'Medical facility issues', is_chronic: false },
    { code: 'Z76', category: 'Z70-Z76', description: 'Persons encountering health services', is_chronic: false },
    { code: 'Z79', category: 'Z70-Z76', description: 'Long-term drug therapy', is_chronic: true },
    { code: 'Z80', category: 'Z80-Z99', description: 'Family history of malignant neoplasm', is_chronic: true },
    { code: 'Z82', category: 'Z80-Z99', description: 'Family history of diseases', is_chronic: true },
    { code: 'Z83', category: 'Z80-Z99', description: 'Family history of other disorders', is_chronic: true },
    { code: 'Z85', category: 'Z80-Z99', description: 'Personal history of malignant neoplasm', is_chronic: true },
    { code: 'Z86', category: 'Z80-Z99', description: 'Personal history of other diseases', is_chronic: true },
    { code: 'Z87', category: 'Z80-Z99', description: 'Personal history of other conditions', is_chronic: true },
    { code: 'Z88', category: 'Z80-Z99', description: 'Allergy status to drugs', is_chronic: true },
    { code: 'Z89', category: 'Z80-Z99', description: 'Acquired absence of limb', is_chronic: true },
    { code: 'Z90', category: 'Z80-Z99', description: 'Acquired absence of organs', is_chronic: true },
    { code: 'Z91', category: 'Z80-Z99', description: 'Risk factors for diseases', is_chronic: true },
    { code: 'Z92', category: 'Z80-Z99', description: 'Medical treatment history', is_chronic: true },
    { code: 'Z93', category: 'Z80-Z99', description: 'Artificial opening status', is_chronic: true },
    { code: 'Z94', category: 'Z80-Z99', description: 'Transplant status', is_chronic: true },
    { code: 'Z95', category: 'Z80-Z99', description: 'Cardiac device in place', is_chronic: true },
    { code: 'Z96', category: 'Z80-Z99', description: 'Other implant presence', is_chronic: true },
    { code: 'Z97', category: 'Z80-Z99', description: 'Other device presence', is_chronic: true },
    { code: 'Z98', category: 'Z80-Z99', description: 'Post-surgical states', is_chronic: true },
    { code: 'Z99', category: 'Z80-Z99', description: 'Dependence on life support', is_chronic: true },
  ];

  for (const code of icd10Codes) {
    await knex('icd10_codes').insert({ ...code, full_description: `${code.code}: ${code.description}` });
  }

  // Seed common medications
  const medications = [
    { generic_name: 'Paracetamol', brand_names: 'Panadol, Tylenol, Acamol', category: 'Analgesic', route: 'oral', dosage_form: 'tablet', strength: '500mg, 1000mg', indications: 'Mild to moderate pain, fever', contraindications: 'Liver disease', side_effects: 'Nausea, rash', interactions: 'Alcohol, warfarin' },
    { generic_name: 'Ibuprofen', brand_names: 'Brufen, Advil, Motrin', category: 'NSAID', route: 'oral', dosage_form: 'tablet', strength: '200mg, 400mg, 600mg', indications: 'Pain, inflammation, fever', contraindications: 'Peptic ulcer, asthma', side_effects: 'GI bleeding, renal impairment', interactions: 'Aspirin, anticoagulants' },
    { generic_name: 'Amoxicillin', brand_names: 'Amoxil, Moxypen', category: 'Antibiotic', route: 'oral', dosage_form: 'capsule', strength: '250mg, 500mg', indications: 'Bacterial infections', contraindications: 'Penicillin allergy', side_effects: 'Diarrhea, rash', interactions: 'Oral contraceptives' },
    { generic_name: 'Azithromycin', brand_names: 'Zithromax, Sumamed', category: 'Antibiotic', route: 'oral', dosage_form: 'tablet', strength: '250mg, 500mg', indications: 'Respiratory infections, STIs', contraindications: 'QT prolongation', side_effects: 'GI upset, headache', interactions: 'Antacids' },
    { generic_name: 'Metformin', brand_names: 'Glucophage, Dianben', category: 'Antidiabetic', route: 'oral', dosage_form: 'tablet', strength: '500mg, 850mg, 1000mg', indications: 'Type 2 diabetes', contraindications: 'Renal failure, liver disease', side_effects: 'GI upset, lactic acidosis', interactions: 'Contrast media' },
    { generic_name: 'Omeprazole', brand_names: 'Losec, Prilosec, Omez', category: 'PPI', route: 'oral', dosage_form: 'capsule', strength: '20mg, 40mg', indications: 'GERD, gastric ulcer', contraindications: 'Long-term use caution', side_effects: 'Headache, diarrhea', interactions: 'Clopidogrel' },
    { generic_name: 'Atorvastatin', brand_names: 'Lipitor', category: 'Statin', route: 'oral', dosage_form: 'tablet', strength: '10mg, 20mg, 40mg, 80mg', indications: 'Hyperlipidemia', contraindications: 'Liver disease, pregnancy', side_effects: 'Myalgia, liver enzyme elevation', interactions: 'Grapefruit juice, warfarin' },
    { generic_name: 'Losartan', brand_names: 'Cozaar, Angizaar', category: 'ARB', route: 'oral', dosage_form: 'tablet', strength: '25mg, 50mg, 100mg', indications: 'Hypertension', contraindications: 'Pregnancy, renal artery stenosis', side_effects: 'Dizziness, hyperkalemia', interactions: 'Diuretics, NSAIDs' },
    { generic_name: 'Amlodipine', brand_names: 'Norvasc, Amlocard', category: 'Calcium Channel Blocker', route: 'oral', dosage_form: 'tablet', strength: '5mg, 10mg', indications: 'Hypertension, angina', contraindications: 'Severe hypotension', side_effects: 'Edema, headache', interactions: 'Grapefruit juice' },
    { generic_name: 'Salbutamol', brand_names: 'Ventolin, Proventil', category: 'Bronchodilator', route: 'inhalation', dosage_form: 'inhaler', strength: '100mcg/dose', indications: 'Asthma, COPD', contraindications: 'None significant', side_effects: 'Tremor, tachycardia', interactions: 'Beta-blockers' },
    { generic_name: 'Warfarin', brand_names: 'Coumadin, Marevan', category: 'Anticoagulant', route: 'oral', dosage_form: 'tablet', strength: '1mg, 2mg, 5mg', indications: 'Atrial fibrillation, DVT, PE', contraindications: 'Bleeding disorders', side_effects: 'Bleeding, bruising', interactions: 'Many drug/food interactions' },
    { generic_name: 'Aspirin', brand_names: 'Aspirin, Disprin', category: 'Antiplatelet', route: 'oral', dosage_form: 'tablet', strength: '75mg, 100mg, 300mg', indications: 'Pain, fever, prevention of stroke/MI', contraindications: 'Peptic ulcer, children', side_effects: 'GI bleeding', interactions: 'Anticoagulants, NSAIDs' },
    { generic_name: 'Insulin Glargine', brand_names: 'Lantus, Basaglar', category: 'Antidiabetic', route: 'subcutaneous', dosage_form: 'injection', strength: '100U/mL', indications: 'Type 1 and 2 diabetes', contraindications: 'Hypoglycemia', side_effects: 'Hypoglycemia, weight gain', interactions: 'Many' },
    { generic_name: 'Levothyroxine', brand_names: 'Eltroxin, Synthroid', category: 'Thyroid Hormone', route: 'oral', dosage_form: 'tablet', strength: '25mcg, 50mcg, 100mcg, 150mcg', indications: 'Hypothyroidism', contraindications: 'Thyrotoxicosis', side_effects: 'Palpitations, weight loss', interactions: 'Calcium, iron' },
    { generic_name: 'Prednisolone', brand_names: 'Deltacortil, Predsol', category: 'Corticosteroid', route: 'oral', dosage_form: 'tablet', strength: '5mg, 10mg, 20mg', indications: 'Inflammation, autoimmune disease', contraindications: 'Infections', side_effects: 'Weight gain, osteoporosis, hyperglycemia', interactions: 'NSAIDs, vaccines' },
    { generic_name: 'Ciprofloxacin', brand_names: 'Cipro, Ciproxin', category: 'Antibiotic', route: 'oral', dosage_form: 'tablet', strength: '250mg, 500mg', indications: 'UTI, respiratory infections', contraindications: 'Tendon disease, children', side_effects: 'Tendonitis, GI upset', interactions: 'Antacids, theophylline' },
    { generic_name: 'Diazepam', brand_names: 'Valium, Stesolid', category: 'Benzodiazepine', route: 'oral', dosage_form: 'tablet', strength: '2mg, 5mg, 10mg', indications: 'Anxiety, seizures', contraindications: 'Respiratory depression', side_effects: 'Drowsiness, dependence', interactions: 'Alcohol, opioids' },
    { generic_name: 'Fluoxetine', brand_names: 'Prozac, Deprax', category: 'SSRI', route: 'oral', dosage_form: 'capsule', strength: '20mg, 40mg', indications: 'Depression, anxiety, OCD', contraindications: 'MAOI use', side_effects: 'Nausea, insomnia, sexual dysfunction', interactions: 'MAOIs, NSAIDs' },
    { generic_name: 'Cetirizine', brand_names: 'Zyrtec, Zilc', category: 'Antihistamine', route: 'oral', dosage_form: 'tablet', strength: '10mg', indications: 'Allergic rhinitis, urticaria', contraindications: 'Severe renal impairment', side_effects: 'Drowsiness, dry mouth', interactions: 'Alcohol' },
    { generic_name: 'Ranitidine', brand_names: 'Zantac, Raniben', category: 'H2 Antagonist', route: 'oral', dosage_form: 'tablet', strength: '150mg, 300mg', indications: 'GERD, peptic ulcer', contraindications: 'None significant', side_effects: 'Headache, diarrhea', interactions: 'None significant' },
  ];

  for (const med of medications) {
    await knex('medication_database').insert(med);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('patient_allergies');
  await knex.schema.dropTableIfExists('medication_database');
  await knex.schema.dropTableIfExists('icd10_codes');
}
