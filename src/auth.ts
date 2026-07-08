import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { db } from "./lib/db";
import { loginSchema } from "./lib/validation";
import { createTrialSubscription } from "./lib/subscription";
import { recordAcceptance } from "./lib/legal/acceptance";
import { LEGAL_VERSIONS } from "./lib/legal/company";

const providers: NextAuthConfig["providers"] = [];

// Google social login (attivo se configurato)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

// Credenziali email/password (per gli account già esistenti)
providers.push(
  Credentials({
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;
      const { email, password } = parsed.data;

      const user = await db.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      return { id: user.id, email: user.email, name: user.name };
    },
  }),
);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  events: {
    // al primo accesso social: crea profilo + trial
    async createUser({ user }) {
      if (!user.id) return;
      await db.athleteProfile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id },
      });
      const existing = await db.subscription.findUnique({
        where: { userId: user.id },
      });
      if (!existing) await createTrialSubscription(user.id);
      // Registrazione via Google: il pulsante è abilitato solo dopo aver
      // accettato Termini/Privacy e approvato le clausole vessatorie (gate in
      // GoogleRegister). Registriamo la prova del consenso.
      try {
        await Promise.all([
          recordAcceptance(user.id, "terms", LEGAL_VERSIONS.terms),
          recordAcceptance(user.id, "privacy", LEGAL_VERSIONS.privacy),
          recordAcceptance(user.id, "vexatious", LEGAL_VERSIONS.terms),
        ]);
      } catch {
        /* non bloccare la creazione utente */
      }
    },
  },
});
