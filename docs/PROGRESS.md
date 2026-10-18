# Progression

> Claude : mets ce fichier à jour à CHAQUE fin de tâche. Garde-le court (journal : 10 entrées max, les anciennes sont regroupées).

## État actuel (2026-10-18, fin de session)
- **Phase :** 3 terminée côté code (transcription visible dans le site) → refonte visuelle (T0.7) puis éditeur de transcription (T3.2).
- **En ligne (dev ET prod) :** connexion lien magique + captcha, crédits (10 offerts), upload vidéo (50 Mo), liste des projets, page projet, renommer, supprimer.
- **Code testé en DEV seulement (pas en prod) :** transcription complète (tables `jobs`/`transcripts`, tâche `transcribe-project`, interface : choix de langue, coût avant, progression, texte mot par mot synchronisé, mots douteux, copier/SRT/TXT) ; aperçu vidéo universel (copie H.264, tâche `create-video-preview`) ; thèmes v2 (3 palettes × clair/sombre, bouton soleil/lune, page Paramètres › Apparence, `/dev/themes`).
- **GitHub :** tout est poussé (dernier push = `fe9350b`, 2026-10-18). Pousser de nouveau seulement quand Ashanti dit « push ». Rien de ceci n’est en prod : prod = ancienne version (déploiement Netlify automatique ou manuel à vérifier avant de dire le contraire).
- **Migrations :** 4 sur dev + prod ; sur DEV seulement : `jobs`, `video_preview` et `transcript_original` (texte d’origine gardé). `supabase/.temp/project-ref` doit rester sur DEV (lbigqadoaciuvvhdhitr) ; prod = dxrsgnuyehewkooszonk (relier, pousser, REVENIR sur dev).
- **Tests :** 75 unitaires verts ; intégration (base dev) verts au dernier passage ; E2E : `theme.spec.ts` et `palette.spec.ts` modifiés/écrits mais **pas relancés** (arrêter `npm run dev` avant).

## Pour reprendre (ordre)
1. Lancer `npm run dev` (terminal 1) et `npx trigger.dev@latest dev` (terminal 2, déjà connecté).
2. Ashanti valide à l’œil `/fr/settings/appearance` et la page projet (captures dans `capture/`).
3. **T0.7 — refonte visuelle (Sonnet)** : page projet, liste, upload, compte, connexion avec le design de `docs/DESIGN.md` (direction « Studio sobre » + galerie vivante). Inclure **T2.5 aperçu instantané** (D17 : la vidéo s’affiche dès le choix du fichier, avant la fin de l’envoi).
4. **T3.2 — éditeur de transcription** (corriger un mot, fusionner/scinder).
5. **Déploiement en prod** : migrations `jobs` + `video_preview` sur PROD (accord d’Ashanti), `npx trigger.dev deploy`, clés dans Netlify, `ASSEMBLYAI_API_KEY` dans Trigger.dev, puis `git push`.
6. Ensuite (Opus pour T4.1) : moteur de styles de sous-titres Remotion (T4.x), traduction 100+ langues (T5.x), interface en plus de langues (T5.3, arabe en RTL).

## Où lire quoi
- Design : `docs/DESIGN.md` · références et captures : `capture/design/` (brief, tokens, maquettes, captures Submagic / Caption Studio).
- Langues : `docs/features/languages.md` · décisions : `docs/DECISIONS.md` (D14 licences, D15 palettes, D16 langues, D17 aperçu instantané, D18 pas de style verrouillé, D19 design) · licences : `docs/THIRD_PARTY.md` + `CLAUDE.md` §10.

## Bloquants / à faire par Ashanti
- Plus tard : nom de domaine + Resend avant d’inviter de vrais utilisateurs ; carte pour Cloudflare R2 avant le lancement (stockage provisoire = 50 Mo) ; clé ElevenLabs ; limite de dépense Trigger.dev.
- Clé Trigger.dev DEV expire le 2027-01-16.
- Confirmer le style de la landing et du logo quand on y sera (T9.1).

## Comptes (état)
- [x] GitHub (Semgendev/semgen) · Netlify (semgen.netlify.app) · Supabase (dev + prod) · Cloudflare (Turnstile) · Trigger.dev (Free) · AssemblyAI ($50 offerts) · Sentry · PostHog (EU)
- [ ] ElevenLabs · Anthropic API · AWS (Remotion Lambda) · FedaPay · pawaPay · Resend · Upstash

## Journal
| Date | Tâche | Résultat |
|---|---|---|
| 2026-10-17 | T0.1 à T0.5 : Next.js 16, thème, i18n FR/EN, CI + Netlify, Sentry + PostHog | ✅ |
| 2026-10-18 | T1.1 à T1.3 : crédits (RLS, réserve/remboursement), lien magique + Turnstile, solde + historique | ✅ dev + prod |
| 2026-10-18 | T2.1, T2.2 : upload vidéo, liste, page projet, renommer, supprimer | ✅ dev + prod |
| 2026-10-18 | T2.3 + T3.1 moteur : premier vrai test (FR détecté 0,83 ; 47 mots ; 1 crédit ; vidéo sans audio refusée) | ✅ dev |
| 2026-10-18 | Aperçu vidéo universel (iPhone HEVC/HDR → MP4 H.264, 1 Mo) | ✅ dev |
| 2026-10-18 | Transcription dans le site (langue, coût, progression, karaoké, SRT/TXT) | ✅ dev, vu en capture |
| 2026-10-18 | Analyse design Submagic / Caption Studio ; `DESIGN.md`, `languages.md`, D14–D19 | ✅ |
| 2026-10-18 | T0.6 thèmes v2 : 3 palettes × 2 modes, tokens, Apparence, `/dev/themes`, tests contraste / couleurs en dur | ✅ dev, vu en capture |
| 2026-10-18 | Bascule clair/sombre en un seul bouton (plus de « Système ») | ✅ |
| 2026-10-18 | T0.7 + T2.5 : barre du haut commune (projets/compte), aperçu instantané à l’upload, liste et page projet restylées | 🟡 code fait, lint/types/75 tests verts ; à valider à l’œil par Ashanti (pas de capture E2E) |

| 2026-10-18 | T3.2 éditeur de transcription : corriger un mot, nouvelle ligne, fusion, chercher/remplacer, annuler/rétablir, enregistrer (action serveur, sans migration) | 🟡 code fait, lint/types/tests unitaires verts ; à tester à l’œil ; E2E à écrire |

| 2026-10-18 | Éditeur v2 (retours d’Ashanti) : mot modifiable directement au toucher, barre de recherche + icône chercher/remplacer, Entrée/Espace = pause (bureau) | 🟡 code fait, 89 tests unitaires verts ; à valider à l’œil |

| 2026-10-18 | Éditeur v3 : recherche = trouver seulement ; outil « Remplacer un mot » séparé (icône seule, panneau avec titre, Chercher / Remplacer par, croix) ; icônes supprimer / nouvelle ligne au survol d’un mot | 🟡 code fait, 96 tests unitaires verts ; à valider à l’œil |

| 2026-10-18 | Éditeur v4 : « Remplacer un mot » devient une fenêtre au centre (Chercher / Remplacer par / Tout remplacer / Annuler), comme la référence d’Ashanti | 🟡 code fait, 96 tests unitaires verts ; à valider à l’œil |

| 2026-10-18 | Éditeur v6 : enregistrement automatique (1 s après la dernière modification, sablier puis « Enregistré », « Réessayer » si échec). v5 : « Remplacer un mot » = petit panneau flottant déplaçable (sans flou), se ferme après « Tout remplacer » avec confirmation | 🟡 code fait, 96 tests verts ; déplacement à tester à l’œil (non couvert par les tests) |

## Problèmes ouverts
- Éditeur : l’original est gardé côté serveur (colonnes `original_words`, `original_segments`, `is_edited`) ; bouton « Revenir au texte d’origine » avec confirmation. Pas de rate limiting sur l’enregistrement (Upstash pas encore en place).
- Correction automatique des fautes (Claude Haiku) : demandée par Ashanti, à spécifier ; compte Anthropic API à créer.
- Le serveur local garde parfois l’ancien CSS : le redémarrer (`Ctrl+C`, `npm run dev`).
- **Ne pas lancer `npm run build` / `test:e2e` pendant que le serveur local tourne** (`.next` partagé, page qui clignote).
- E2E à ajouter/relancer : palettes, bascule de thème, page projet (compte de test + worker nécessaires).
- Aperçu vidéo : pas de limite de débit sur « Réessayer » (Upstash) ; un aperçu bloqué en « processing » n’est pas relancé automatiquement.
- Upload : pas de rate limiting ; type MIME seulement déclaré (vérifier les premiers octets).
- Stockage vidéo provisoire Supabase (50 Mo) → R2 avant le lancement (adapter le client TUS en multipart S3).
- Emails Supabase limités (~2-4/h) : Resend + domaine avant de vrais utilisateurs. Domaines (semgen.studio/.com/.ai) et marque (OMPI, EUIPO, USPTO classes 9 et 42) à vérifier.
- Tests d’intégration hors CI (il faudrait des secrets GitHub vers un projet de test) ; ils créent des comptes `@example.com` supprimés à la fin (nettoyer à la main si interrompus).
- Paquets installés avec `--legacy-peer-deps` (conflit babel shadcn) : à réévaluer.
- Dossier `capture/` ignoré par git (captures et références d’Ashanti) : le garder en local.
