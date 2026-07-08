import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome troppo corto").max(80),
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "La password deve avere almeno 8 caratteri"),
  // Accettazione Termini + Privacy (obbligatoria)
  acceptTerms: z.boolean().refine((v) => v === true, {
    message: "Devi accettare i Termini e la Privacy Policy",
  }),
  // Approvazione SPECIFICA delle clausole vessatorie ex art. 1341-1342 c.c.
  // (casella separata, obbligatoria)
  acceptVexatious: z.boolean().refine((v) => v === true, {
    message: "Devi approvare specificamente le clausole indicate (art. 1341-1342 c.c.)",
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password richiesta"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  sex: z.enum(["M", "F", "other"]).optional(),
  birthDate: z.string().optional(),
  heightCm: z.coerce.number().int().positive().optional(),
  weightKg: z.coerce.number().positive().optional(),
  restingHr: z.coerce.number().int().positive().optional(),
  maxHr: z.coerce.number().int().positive().optional(),
  experience: z.enum(["beginner", "intermediate", "advanced", "elite"]).optional(),
  weeklyVolumeKm: z.coerce.number().nonnegative().optional(),
  goalRaceDistanceKm: z.coerce.number().positive().optional(),
  goalTargetTimeSec: z.coerce.number().positive().optional(),
  goalRaceDate: z.string().optional(),
  daysPerWeek: z.coerce.number().int().min(1).max(7).optional(),
  otherSports: z.string().max(200).optional(),
  crossTraining: z.array(z.string()).optional(),
  llmCount: z.coerce.number().int().min(1).max(3).optional(),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const CROSS_TRAINING_OPTIONS = [
  "pliometria",
  "ginnastica",
  "pesi",
  "bicicletta",
  "nuoto",
  "altro",
] as const;

export const raceSchema = z.object({
  name: z.string().min(2, "Nome gara troppo corto").max(120),
  distanceKm: z.coerce.number().positive("Distanza non valida"),
  raceDate: z.string().optional(),
  targetTimeSec: z.coerce.number().positive().optional(),
  priority: z.enum(["A", "B", "C"]).default("A"),
  notes: z.string().max(500).optional(),
});
export type RaceInput = z.infer<typeof raceSchema>;

// Log soggettivo post-sessione (Modulo 4)
export const subjectiveSchema = z.object({
  rpe: z.coerce.number().int().min(1).max(10).optional(),
  legs: z.coerce.number().int().min(1).max(5).optional(),
  sleepPerceived: z.coerce.number().int().min(1).max(5).optional(),
  mood: z.coerce.number().int().min(1).max(5).optional(),
  niggle: z.string().max(300).optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().optional(),
  activityId: z.string().optional(),
});
export type SubjectiveInput = z.infer<typeof subjectiveSchema>;

const zonePair = z.object({
  min: z.coerce.number().int().positive().optional(),
  max: z.coerce.number().int().positive().optional(),
});
export const hrZonesSchema = z.object({
  z1: zonePair.optional(),
  z2: zonePair.optional(),
  z3: zonePair.optional(),
  z4: zonePair.optional(),
  z5: zonePair.optional(),
});
export type HrZonesInput = z.infer<typeof hrZonesSchema>;
