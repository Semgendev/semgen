# Progression

> Claude : mets ce fichier à jour à CHAQUE fin de tâche. Garde-le court (journal : 10 entrées max, les anciennes sont regroupées).

## État actuel (2026-10-19 — Opus)
- **Phase :** 4 commencée. T0.7, T2.5, T3.2 faits. **T4.1 étapes 1-2 faites** (moteur Remotion + 6 styles + choix enregistré) ; **en attente des captures d’Ashanti** avant l’étape 3.
- **En ligne (dev ET prod) :** connexion lien magique + captcha, crédits (10 offerts), upload vidéo (50 Mo), liste des projets, page projet, renommer, supprimer.
- **Code testé en DEV seulement (pas en prod) :** transcription complète ; aperçu vidéo H.264 ; thèmes v2 ; refonte visuelle + aperçu instantané ; éditeur de transcription (correction au toucher, supprimer, nouvelle ligne, fusion, recherche, panneau flottant « Remplacer un mot », annuler/rétablir, **sauvegarde automatique**, **retour au texte d’origine**) ; **sous-titres animés Remotion** sur la page projet (styles Cinéma, Élégance, Viral, Karaoké, Néon, Minimal).
- **GitHub :** poussé jusqu’à `04eef45`. **Commit local non poussé : `ed7e559`** (T4.1). Pousser seulement quand Ashanti dit « push ».
- **Migrations :** 4 sur dev + prod ; sur DEV seulement : `jobs`, `video_preview`, `transcript_original` et `project_caption_style`. `supabase/.temp/project-ref` doit rester sur DEV (lbigqadoaciuvvhdhitr) ; prod = dxrsgnuyehewkooszonk (relier, pousser, REVENIR sur dev).
- **Tests :** 121 unitaires verts ; intégration (base dev) 34 verts ; E2E pas relancés (arrêter `npm run dev` avant).

## Pour reprendre (ordre)
1. Lancer `npm run dev` (terminal 1) et `npx trigger.dev@latest dev` (terminal 2).
2. **Revoir la synchro sur la vidéo** (corrigée le 2026-10-19 : texte en avance de 120 ms, plus de clignotement entre les pages, pas de page d'un seul mot). Puis **captures des styles** (page projet avec transcription → « Style des sous-titres » → lancer la vidéo) : Cinéma, Élégance, Viral au minimum. Retoucher tailles/espacements/couleurs jusqu’à un rendu vraiment pro.
3. **T4.1 étape 3 (Opus), plan validé par Ashanti** : moteur v2 (ressorts, flou de mouvement, mot fort avec lueur avancée, reflet, dégradés, entrée/emphase/sortie) + 5 prototypes (Pop à ressort, Remplissage karaoké, Espacement qui s'ouvre, Néon qui vacille, Séparation RVB) sur une page `/dev/animations` (ralenti, image par image, réglages), sans nouvelle dépendance. Cahier des charges : `docs/features/captions-animations.md`. Ensuite galerie vivante (aperçu animé de chaque style sur la vidéo de l’utilisateur), puis commit.
4. **T4.2 (Sonnet)** : 14 autres styles + personnalisation (police, couleurs, contour, position). **T4.4** : export Remotion Lambda (compte AWS à créer).
5. **Déploiement en prod** quand T4.1 est validé : les 4 migrations DEV sur PROD (accord d’Ashanti), `npx trigger.dev deploy`, clés Netlify, `ASSEMBLYAI_API_KEY` dans Trigger.dev.
6. Règle convenue : ne plus peaufiner l’éditeur de texte tant que les sous-titres animés ne sont pas validés (noter les retouches dans une liste).

## Où lire quoi
- Animations des sous-titres : `docs/features/captions-animations.md` (objectif : **surpasser** Caption Studio)
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

| 2026-10-18 | T4.1 étapes 1-2 : Remotion installé, moteur de styles (schéma Zod, découpage, mot fort, animations), composition unique aperçu = export, 6 styles (Cinéma, Élégance, Viral, Karaoké, Néon, Minimal), choix du style enregistré (migration `project_caption_style`, DEV) | 🟡 115 tests verts ; à valider à l’œil (captures) ; galerie vivante = étape suivante |

| 2026-10-19 | Synchro des sous-titres (retour d'Ashanti) : texte 120 ms avant la voix, pages reliées si silence < 1,5 s, 0,9 s minimum, sortie après le dernier mot, plus de page d'un seul mot, mot actif sans coupure, lecteur en pause pendant le chargement. Doublons de `capture/` supprimés | 🟡 121 tests verts ; à revoir à l'œil sur la vidéo |

## Problèmes ouverts
- Polices des sous-titres chargées depuis Google Fonts dans le navigateur : à auto-héberger plus tard (vie privée, fiabilité).
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
