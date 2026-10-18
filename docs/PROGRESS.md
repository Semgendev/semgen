# Progression

> Claude : mets ce fichier à jour à CHAQUE fin de tâche. Garde-le court (les 10 dernières entrées max dans le journal).

## État actuel (pause du 2026-10-18)
- **Phase :** 2 — Upload et projets → Phase 3 (transcription) en cours
- **Fait et validé en dev ET prod :** connexion lien magique + captcha, crédits (10 offerts, 1 seul bonus par boîte mail), upload vidéo (50 Mo, Supabase Storage provisoire), liste des projets + page projet avec lecteur, renommer, supprimer.
- **Fait côté code, testé en dev seulement (NON envoyé en prod, NON poussé sur GitHub tant qu’Ashanti n’a pas dit « push ») :** moteur de transcription (T2.3 + T3.1) : tables `jobs` + `transcripts`, `request_transcription()`, tâche Trigger.dev `transcribe-project` (ffprobe serveur, crédits selon la durée réelle, AssemblyAI, remboursement auto), interface `TranscriptionProvider` (AssemblyAI ; ElevenLabs Scribe prévu pour les langues africaines).
- **Migrations :** 4 sur dev + prod (credits_and_profiles, signup_bonus_claims, projects_and_video_storage, + jobs sur DEV seulement). `supabase/.temp/project-ref` doit rester sur DEV (lbigqadoaciuvvhdhitr) ; prod = dxrsgnuyehewkooszonk (relier, pousser, REVENIR sur dev).
- **Tests :** 45 unitaires, 33 d’intégration (base dev), 27 E2E (build prod sur le port 3100). Tout vert au dernier passage.

## Pour reprendre (ordre)
1. Nouveau terminal VS Code (FFmpeg 9.0.2 installé via winget, PATH à recharger) → `npx trigger.dev@latest login` puis `npx trigger.dev@latest dev` (à laisser tourner).
2. ✅ Premier vrai test fait (voir journal).
3. Interface (Sonnet) : bouton « Détecter la langue et transcrire » (choix de langue, coût affiché avant), progression en direct (Realtime sur `jobs`), affichage du texte mot par mot, mots peu sûrs surlignés. Textes FR/EN.
4. Déploiement du worker (`npx trigger.dev deploy`, clé PROD dans Netlify, ASSEMBLYAI_API_KEY dans Trigger.dev), migration jobs sur PROD (accord d’Ashanti), `git push`.
5. Ensuite : ElevenLabs Scribe (compte + clé), limite d’uploads (Upstash), éditeur de transcription (T3.2).

## Bloquants / à faire par Ashanti
- Se connecter à Trigger.dev depuis le terminal et lancer `dev` (voir « Pour reprendre »).
- Plus tard : nom de domaine + Resend avant d’inviter de vrais utilisateurs (les e-mails Supabase sont limités) ; carte bancaire/virtuelle pour Cloudflare R2 avant le lancement (stockage vidéo provisoire = 50 Mo) ; clé ElevenLabs ; limite de dépense Trigger.dev si plan payant.
- Clé Trigger.dev DEV expire le 2027-01-16 (à renouveler).

## Comptes (état)
- [x] GitHub (repo Semgendev/semgen) · [x] Netlify (semgen.netlify.app) · [x] Supabase (dev lbigqadoaciuvvhdhitr, prod dxrsgnuyehewkooszonk) · [x] Cloudflare (Turnstile ; R2 plus tard) · [x] Trigger.dev (proj_cufdcyzzcdrndjgsbnxy, plan Free) · [x] AssemblyAI ($50 offerts, sans carte) · [x] Sentry · [x] PostHog (EU)
- [ ] ElevenLabs · [ ] Anthropic API · [ ] AWS (Remotion Lambda) · [ ] FedaPay · [ ] pawaPay · [ ] Resend · [ ] Upstash

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
| 2026-10-18 | T2.1 | ✅ | Upload vidéo (TUS, 50 Mo, Supabase Storage provisoire) testé en dev ET prod : projet « uploaded » + fichier stocké |
| 2026-10-18 | T2.2 | ✅ | Liste des projets (miniatures via lien signé), page projet avec lecteur vidéo, renommer, supprimer (fichier + ligne), redirection après upload |
| 2026-10-18 | T2.3 + T3.1 (moteur) | ✅ | Premier vrai test (dev) : vidéo FR de 9,8 Mo → langue fr détectée (0,83), 47 mots, 1 crédit débité (10→9) ; vidéo sans audio → refus propre `no_audio`, 0 crédit. Script : scripts/try-transcription.mts. Reste l’interface |

## Problèmes ouverts
- Dev : ne PAS lancer `npm run build` / `test:e2e` pendant que le serveur local tourne (ils partagent `.next` et le corrompent → page qui « clignote »). Arrêter le serveur avant, le relancer après.
- Les tests d’intégration créent des comptes `@example.com` dans la base de dev et les suppriment à la fin ; en cas d’interruption, nettoyer les restes.
- Anti-abus upload : pas encore de rate limiting ; type MIME seulement déclaré (vérifier les premiers octets) ; la durée est vérifiée côté serveur par la tâche de transcription.
- Stockage vidéo PROVISOIRE sur Supabase Storage (50 Mo max, pas de carte bancaire). Prévu : Cloudflare R2 (carte requise) avant le lancement ; le client d’upload (TUS) sera à adapter en multipart S3.
- Upload : pas encore de rate limiting (Upstash), durée vérifiée seulement côté navigateur (ffprobe serveur en T2.3), type MIME seulement déclaré (vérif magic bytes à ajouter).
- Nom de domaine + Resend à prévoir avant d’inviter de vrais utilisateurs.
- Emails Supabase limités (~2-4/h) : avant lancement, Resend + nom de domaine à acheter.
- Anti-abus du bonus (suppression puis réinscription, emails jetables / +alias) : à traiter en T1.2 (captcha, rate limiting, registre des emails ayant reçu un bonus).
- Tests d’intégration (`npm run test:integration`) lancés en local seulement, pas encore dans la CI (il faudrait des secrets GitHub vers un projet de test).
- Projet Supabase de production (`semgen-prod`) à créer avant le lancement.
- Paquets de test installés avec `--legacy-peer-deps` (conflit babel dans shadcn) : à réévaluer plus tard.
- Vérifier la disponibilité des domaines (semgen.studio, semgen.com, semgen.ai) et de la marque (WIPO, EUIPO, USPTO — classes 9 et 42).
