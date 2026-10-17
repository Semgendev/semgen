# Progression

> Claude : mets ce fichier à jour à CHAQUE fin de tâche. Garde-le court (les 10 dernières entrées max dans le journal).

## État actuel
- **Phase :** 0 terminée — Phase 1 à venir
- **Tâche en cours :** aucune (T0.5 finie côté code)
- **Prochaine étape :** Phase 1 (Supabase : compte + authentification) — schéma de base à valider avec Ashanti
- **Bloquants / à faire par Ashanti :** créer le compte Supabase ; supprimer l’ancien compte PostHog US ; vérifier Sentry (optionnel)

## Comptes à créer (au fur et à mesure, Claude dira quand)
- [x] GitHub (repo Semgendev/semgen) · [x] Netlify (compte existant) · [ ] Supabase · [ ] Cloudflare (R2) · [ ] Trigger.dev
- [ ] AssemblyAI · [ ] Anthropic API · [ ] ElevenLabs · [ ] AWS (Remotion Lambda)
- [ ] FedaPay · [ ] pawaPay · [ ] Resend · [ ] Upstash · [x] Sentry · [x] PostHog

## Journal
| Date | Tâche | Résultat | Notes |
|---|---|---|---|
| 2026-10-17 | Préparation du dossier | ✅ | PRD, architecture, roadmap, règles créés |
| 2026-10-17 | T0.1 | ✅ | Next.js 16 + TS strict + Tailwind + shadcn/ui + Prettier + Vitest + Playwright (desktop/tablette/mobile) |
| 2026-10-17 | T0.2 | ✅ | Thème clair/sombre/système (next-themes), palette violet/indigo pilotée par `--brand-hue` dans globals.css, composants Card/Input/Label/Dialog/DropdownMenu/Skeleton, Framer Motion |
| 2026-10-17 | Mise à jour | ✅ | Basé au Bénin (paiements FedaPay + pawaPay), recadrage intelligent ajouté à la V1 |
| 2026-10-17 | T0.3 | ✅ | i18n FR/EN (next-intl), sélecteur de langue, `/en` et `/fr`, test E2E du changement de langue |
| 2026-10-17 | T0.4 | ✅ | Site en ligne : https://semgen.netlify.app ; CI GitHub Actions (lint, types, tests, build, E2E), netlify.toml, middleware renommé en proxy, E2E sur build de production (port 3100) |
| 2026-10-17 | T0.5 | ✅ | Sentry (erreurs) + PostHog (stats, région EU), inactifs sans clés, test unitaire ; clés dans .env.local (ignoré par git) et dans Netlify ; PostHog vérifié en ligne (pageview reçu) |

## Problèmes ouverts
- Paquets de test installés avec `--legacy-peer-deps` (conflit babel dans shadcn) : à réévaluer plus tard.
- Vérifier la disponibilité des domaines (semgen.studio, semgen.com, semgen.ai) et de la marque (WIPO, EUIPO, USPTO — classes 9 et 42).
