# Progression

> Claude : mets ce fichier à jour à CHAQUE fin de tâche. Garde-le court (les 10 dernières entrées max dans le journal).

## État actuel
- **Phase :** 1 — Comptes et crédits
- **Tâche en cours :** T2.1 (upload) — migration appliquée sur dev, 25 tests d’intégration verts. Reste : test réel d’upload dans le navigateur (Ashanti), migration prod après validation
- **Prochaine étape :** test réel d’upload sur localhost, puis T2.2 (liste des projets)
- **Bloquants / à faire par Ashanti :** créer le projet Google Cloud + identifiants OAuth quand on fera Google

## Comptes à créer (au fur et à mesure, Claude dira quand)
- [x] GitHub (repo Semgendev/semgen) · [x] Netlify (compte existant) · [x] Supabase (projet semgen-dev, ref lbigqadoaciuvvhdhitr) · [x] Cloudflare (Turnstile ; R2 plus tard) · [ ] Trigger.dev
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
| 2026-10-18 | T1.1 | ✅ | Migration profiles + credit_ledger (ajout seul) + bonus 10 crédits à la confirmation d’email + reserve/refund_credits (serveur seul, verrou). Audit sécurité appliqué. 14 tests d’intégration verts sur semgen-dev |
| 2026-10-18 | T1.2 (partie 1) | ✅ | Lien magique + Turnstile + registre des bonus + pages login/account ; testé de bout en bout sur dev et prod (10 crédits, un seul bonus) |
| 2026-10-18 | T1.3 | ✅ | Solde dans la barre du haut + page /account/credits (historique du carnet), lecture seule via RLS |

## Problèmes ouverts
- Stockage vidéo PROVISOIRE sur Supabase Storage (50 Mo max, pas de carte bancaire). Prévu : Cloudflare R2 (carte requise) avant le lancement ; le client d’upload (TUS) sera à adapter en multipart S3.
- Upload : pas encore de rate limiting (Upstash), durée vérifiée seulement côté navigateur (ffprobe serveur en T2.3), type MIME seulement déclaré (vérif magic bytes à ajouter).
- Nom de domaine + Resend à prévoir avant d’inviter de vrais utilisateurs.
- Emails Supabase limités (~2-4/h) : avant lancement, Resend + nom de domaine à acheter.
- Anti-abus du bonus (suppression puis réinscription, emails jetables / +alias) : à traiter en T1.2 (captcha, rate limiting, registre des emails ayant reçu un bonus).
- Tests d’intégration (`npm run test:integration`) lancés en local seulement, pas encore dans la CI (il faudrait des secrets GitHub vers un projet de test).
- Projet Supabase de production (`semgen-prod`) à créer avant le lancement.
- Paquets de test installés avec `--legacy-peer-deps` (conflit babel dans shadcn) : à réévaluer plus tard.
- Vérifier la disponibilité des domaines (semgen.studio, semgen.com, semgen.ai) et de la marque (WIPO, EUIPO, USPTO — classes 9 et 42).
