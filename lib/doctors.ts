import type { ClinicLocationKey } from "./constants";

// ─────────────────────────────────────────────────────────────────────────────
// The clinic's doctors, as published on harleystreetaesthetic.co.uk/{city}/team
// (checked 2 Nov 2026). Names, roles, qualifications and focus areas are
// verbatim from the site; photos are the site's own, copied to /public/team.
// GMC numbers are not published on the site, so `gmc` stays null until the
// clinic supplies them; the badge then shows the number. Never invent one.
// ─────────────────────────────────────────────────────────────────────────────

export interface Doctor {
  name: string;
  role: string;
  /** Post-nominals / qualifications as published, or null. */
  qualifications: string | null;
  /** GMC reference number, when the clinic has supplied it. */
  gmc: string | null;
  focus: string[];
  /** One published fact worth repeating (experience, scope), or null. */
  note: string | null;
  photo: string;
  clinics: ClinicLocationKey[];
}

export const DOCTORS: Doctor[] = [
  {
    name: "Dr Ayda Soltanzadeh",
    role: "Consultant Dermatologist",
    qualifications: null,
    gmc: null,
    focus: ["Dermal fillers", "Thread lifts", "Facial contouring", "Skin surgery"],
    note: "Clinical dermatology background with a meticulous approach to aesthetic medicine.",
    photo: "/team/ayda-soltanzadeh.webp",
    clinics: ["london", "glasgow"],
  },
  {
    name: "Dr Nina Ku",
    role: "Dermatologist",
    qualifications: null,
    gmc: null,
    focus: ["Injectables", "Endolift", "Pigmentation", "Laser & energy-based"],
    note: "Practised in the UK, France and wider Europe; speaks English, French and Russian.",
    photo: "/team/nina-ku.webp",
    clinics: ["london"],
  },
  {
    name: "Dr Afraa Mohammed",
    role: "Dermatologist",
    qualifications: "MBBS, MD Dermatology",
    gmc: null,
    focus: ["Clinical dermatology", "Aesthetic medicine", "Skin health"],
    note: "More than 12 years in dermatology and aesthetic medicine.",
    photo: "/team/afraa-mohammed.webp",
    clinics: ["london"],
  },
  {
    name: "Dr Mazhar Khan",
    role: "Medical Doctor",
    qualifications: "MBBS, MRCGP, DRCOG, DFFP",
    gmc: null,
    focus: ["Aesthetic medicine", "Patient care"],
    note: "Over 23 years of clinical experience in NHS and private practice.",
    photo: "/team/mazhar-khan.webp",
    clinics: ["london"],
  },
  {
    name: "Mr Khalil Al-Nakib",
    role: "Consultant Plastic Surgeon",
    qualifications: "FRCSEd",
    gmc: null,
    focus: ["Plastic surgery", "Aesthetic surgery", "Reconstructive surgery", "Laser treatments"],
    note: "Holds regular clinics at our Glasgow clinic.",
    photo: "/team/khalil-al-nakib.webp",
    clinics: ["london", "glasgow"],
  },
];

/** Doctors shown for a clinic, injectors first (as listed above). */
export function doctorsFor(clinic: ClinicLocationKey): Doctor[] {
  return DOCTORS.filter((d) => d.clinics.includes(clinic));
}

/** The clinic's own team page for that city. */
export function teamPageUrl(clinic: ClinicLocationKey): string {
  return `https://www.harleystreetaesthetic.co.uk/${clinic}/team`;
}

/** Where anyone can check a doctor's registration. */
export const GMC_REGISTER_URL = "https://www.gmc-uk.org/registration-and-licensing/the-medical-register";

/**
 * Trust figures. "5,000+ patients" and the Google rating are from the clinic
 * website; "20+ years" and "10,000+ treatments" were given by the clinic owner
 * on 2 Nov 2026. Always paired with "Results vary" copy elsewhere on the page.
 */
export const TRUST_STATS = [
  { value: "GMC", label: "registered doctors only" },
  { value: "20+", label: "years' experience" },
  { value: "10,000+", label: "treatments" },
] as const;
