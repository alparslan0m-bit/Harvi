/**
 * Medical Engine - Semantic Clinical Mapping System
 * Provides smart icon selection based on medical terminology and clinical roots.
 */
class MedicalEngine {
    constructor() {
        /**
         * Core Dictionary & Semantic Roots
         * Priority-based mapping to ensure clinical precision.
         * The order in this array defines the priority (first match wins).
         */
        this.medicalRoots = [
            // PRIORITY 1: High-Specificity Conditions (Diagnostic matches)
            { id: 'metabolic', roots: ['diabetes', 'insulin', 'glyce', 'gluco', 'sugar', 'diabet', 'metabolic', 'ketoacidosis'], icon: 'syringe' },
            { id: 'oncology', roots: ['cancer', 'onco', 'tumor', 'malignan', 'lymphoma', 'sarcoma', 'chemo', 'neoplas', 'carcinoma', 'metastasis'], icon: 'microscope' },
            { id: 'cardio_acute', roots: ['infarct', 'ischemia', 'tachy', 'brady', 'valve', 'aorta', 'arrhythmia', 'angina', 'stent', 'bypass', 'myocard'], icon: 'heart' },

            // PRIORITY 2: Internal Medicine & Sub-specialties
            { id: 'cardio', roots: ['cardio', 'heart', 'vessel', 'hyperten', 'ecg', 'ekg', 'vascular'], icon: 'heart' },
            { id: 'neuro', roots: ['neuro', 'brain', 'psych', 'mental', 'seizure', 'stroke', 'headache', 'spinal', 'cognit', 'nerve', 'palsy'], icon: 'brain' },
            { id: 'pulmon', roots: ['pulmon', 'lung', 'resp', 'breath', 'chest', 'thorax', 'asthma', 'pneumonia', 'copd', 'bronchi', 'ventilat'], icon: 'wind' },
            { id: 'gastro', roots: ['gastro', 'stomach', 'hepat', 'liver', 'chole', 'bowel', 'colon', 'ulcer', 'digestion', 'appendix', 'gastritis', 'esophagus', 'pancreas'], icon: 'utensils' },
            { id: 'renal', roots: ['nephro', 'kidney', 'renal', 'filtration', 'dialysis', 'glomerul', 'creatinine', 'urea'], icon: 'filter' },
            { id: 'hema', roots: ['hema', 'blood', 'anemia', 'coagula', 'platelet', 'leukemia', 'hemoglob', 'thrombos', 'transfusion'], icon: 'droplet' },
            { id: 'endo', roots: ['endo', 'hormone', 'thyroid', 'adrenal', 'pituitary', 'parathyroid', 'gonad'], icon: 'zap' },
            { id: 'rheum', roots: ['rheum', 'arthritis', 'joint', 'lupus', 'vasculitis', 'autoimmune', 'connective', 'gout'], icon: 'activity' },
            { id: 'infectious', roots: ['micro', 'bacter', 'virus', 'infect', 'sepsis', 'parasite', 'fungal', 'vial', 'antibiotic', 'tbc', 'hiv'], icon: 'vial' },
            { id: 'geriatrics', roots: ['geriat', 'elderly', 'aging', 'palliative', 'dementia', 'hospice'], icon: 'users' },
            { id: 'toxico', roots: ['toxic', 'poison', 'overdose', 'venom', 'antidote'], icon: 'skull' },
            { id: 'nutrition', roots: ['nutri', 'diet', 'vitamin', 'obesity', 'mineral'], icon: 'apple' },

            // PRIORITY 3: Surgery & Sub-specialties
            { id: 'surgery_gen', roots: ['surg', 'operat', 'incision', 'triage', 'suture', 'laparo', 'cholecystectomy', 'gastrectomy', 'hernia', 'appendix'], icon: 'scissors' },
            { id: 'ortho', roots: ['ortho', 'bone', 'skelet', 'fracture', 'trauma', 'joint', 'spine', 'muscle', 'tendon', 'ligament', 'ortho', 'scolio'], icon: 'bone' },
            { id: 'vascular', roots: ['vascular', 'artery', 'vein', 'bypass', 'carotid', 'aortic', 'aneurysm', 'varicose'], icon: 'git-branch' },
            { id: 'urology', roots: ['urolo', 'bladder', 'urine', 'prostate', 'calculus', 'scrotal', 'penile', 'testis'], icon: 'test-tube' },
            { id: 'ent', roots: ['ent', 'ear', 'nose', 'throat', 'otolaryng', 'hearing', 'sinus', 'tonsil', 'larynx'], icon: 'ear' },
            { id: 'ophthal', roots: ['ophthalm', 'eye', 'vision', 'retina', 'cornea', 'cataract', 'glaucoma', 'ocular'], icon: 'eye' },
            { id: 'plastic', roots: ['plastic', 'reconst', 'aesthetic', 'burn', 'skin-graft', 'cosmetic', 'maxillo'], icon: 'sparkles' },
            { id: 'transplant', roots: ['transplant', 'graft', 'allograft', 'donor'], icon: 'refresh-cw' },

            // PRIORITY 4: Other Major Fields
            { id: 'obgyn', roots: ['obgyn', 'matern', 'pregna', 'gyneco', 'woman', 'birth', 'fetus', 'ovary', 'uterus', 'vagina', 'breast'], icon: 'sparkles' },
            { id: 'pedia', roots: ['pedia', 'child', 'infant', 'neonat', 'baby', 'adolescent'], icon: 'baby' },
            { id: 'pharma', roots: ['pharma', 'drug', 'pill', 'dose', 'medica', 'pharmacology', 'toxicology'], icon: 'pill' },
            { id: 'genetic', roots: ['genetic', 'dna', 'chromo', 'heredi', 'mutation', 'genom', 'syndrome'], icon: 'dna' },
            { id: 'derm', roots: ['derma', 'skin', 'cutan', 'layer', 'rash', 'lesion', 'melanoma', 'eczema', 'psoriasis'], icon: 'layers' },
            { id: 'emergency', roots: ['emergency', 'trauma', 'resuscit', 'triage', 'siren', 'icu', 'critical', 'shock'], icon: 'siren' },
            { id: 'rehab', roots: ['rehab', 'physiatr', 'physical therapy', 'occupational therapy', 'accessibility'], icon: 'accessibility' },
            { id: 'immune', roots: ['immu', 'allergy', 'antibody', 'antigen', 'shield', 'serology'], icon: 'shield' }
        ];
    }

    /**
     * Get a smart icon based on text content using semantic root matching
     * @param {string} text - The clinical text to analyze
     * @param {string} defaultIcon - Fallback icon name
     * @returns {string} - HTML string for the icon
     */
    getSmartIcon(text, defaultIcon = 'stethoscope') {
        const query = (text || '').toLowerCase();

        // Find the first matching medical root group
        const match = this.medicalRoots.find(group =>
            group.roots.some(root => query.includes(root.toLowerCase()))
        );

        const iconName = match ? match.icon : defaultIcon;
        return `<i data-lucide="${iconName}"></i>`;
    }
}

// Global Singleton Instance
window.medicalEngine = new MedicalEngine();
