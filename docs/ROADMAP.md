# Roadmap — tâches dans l'ordre (une à la fois)

Légende modèle conseillé : 🟣 Opus · 🔵 Sonnet · 🟢 Haiku

## Phase 0 — Fondations
- [x] T0.1 🔵 Initialiser Next.js + TypeScript strict + Tailwind + shadcn/ui + ESLint/Prettier + Vitest + Playwright
- [ ] T0.2 🔵 Thème clair/sombre (`next-themes`) + design system (couleurs, typos, composants de base)
- [ ] T0.3 🟢 i18n FR/EN (`next-intl`) + sélecteur de langue
- [ ] T0.4 🔵 CI GitHub Actions (lint, typecheck, tests) + déploiement Netlify preview
- [ ] T0.5 🔵 Sentry + PostHog

## Phase 1 — Comptes et crédits (F1)
- [ ] T1.1 🟣 Schéma Supabase + RLS + `credit_ledger` + fonctions `reserve_credits` / `refund_credits`
- [ ] T1.2 🔵 Auth email + Google, pages connexion/inscription, 10 crédits offerts à l'inscription
- [ ] T1.3 🔵 Affichage du solde + historique des crédits

## Phase 2 — Upload et projets (F2)
- [ ] T2.1 🔵 Upload multipart vers R2 (URL signée), barre de progression, contrôle taille/type/durée
- [ ] T2.2 🔵 Tableau de bord des projets (liste, renommer, supprimer)
- [ ] T2.3 🟣 Mise en place Trigger.dev + table `jobs` + progression en temps réel

## Phase 3 — Transcription (F3)
- [ ] T3.1 🔵 Extraction audio FFmpeg + AssemblyAI + détection langue + intervenants
- [ ] T3.2 🔵 Éditeur de transcription (corriger un mot, fusionner/scinder)

## Phase 4 — Sous-titres animés (F4, F8)
- [ ] T4.1 🟣 Composition Remotion unique (aperçu = export) + moteur de styles
- [ ] T4.2 🔵 20 styles premium + personnalisation (police, couleurs, contour, ombre, mots forts, emojis)
- [ ] T4.3 🔵 Éditeur : timeline, glisser la position, ajuster le timing
- [ ] T4.4 🔵 Export Remotion Lambda (9:16, 1:1, 16:9) + filigrane plan gratuit

## Phase 5 — Traduction (F5)
- [ ] T5.1 🔵 Traduction par segment (Claude Haiku) + redistribution du timing
- [ ] T5.2 🔵 Sélecteur multi-langues « tout traduire en 1 clic » + bascule de langue dans l'éditeur

## Phase 6 — Montage automatique (F6)
- [ ] T6.1 🔵 Détection silences + mots de remplissage
- [ ] T6.2 🟣 Détection répétitions / prises ratées (Claude) + score de confiance
- [ ] T6.3 🔵 Interface de validation des coupes (avant/après, annuler une coupe) + export

## Phase 6b — Recadrage intelligent (F12)
- [ ] T6b.1 🔵 Recadrage manuel : choix du format (9:16, 1:1, 4:5, 4:3, 16:9, 21:9) + cadre déplaçable + fond flou / couleur
- [ ] T6b.2 🟣 Recadrage auto : suivi du visage / de la personne qui parle, mouvements de caméra lissés
- [ ] T6b.3 🔵 Export multi-formats en un clic (même projet, plusieurs formats)

## Phase 7 — Doublage (F7)
- [ ] T7.1 🔵 Intégration ElevenLabs Dubbing + piste audio par langue
- [ ] T7.2 🔵 Consentement voix + mention « audio généré par IA »

## Phase 8 — Paiements (F9)
- [ ] T8.1 🟣 Interface `PaymentProvider` + FedaPay (cartes + MTN/Moov) + webhook signé + idempotence
- [ ] T8.2 🟣 pawaPay (Mobile Money autres pays d'Afrique) + sélection auto selon le pays
- [ ] T8.3 🔵 Page tarifs + packs + devises locales

## Phase 9 — Lancement
- [ ] T9.1 🔵 Landing page premium + démo vidéo + SEO
- [ ] T9.2 🟢 Pages légales (CGU, confidentialité, remboursement, cookies), emails Resend
- [ ] T9.3 🟣 Audit sécurité complet (`security-auditor`) + tests E2E sur tous les écrans (`qa-tester`)
- [ ] T9.4 🔵 Mise en production + monitoring

## Après la V1
V2 → V5 : voir `PRD.md` section 5.
