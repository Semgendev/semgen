# Coûts et crédits

## 1. Démarrer avec ~50 €/mois

| Service | Offre de départ | Coût |
|---|---|---|
| Netlify | Gratuit | 0 € |
| Supabase | Gratuit (passer à Pro ~25 $/mois au lancement public) | 0 € → 25 $ |
| Cloudflare R2 | 10 Go gratuits, pas de frais de sortie | 0 € |
| Trigger.dev | Offre gratuite | 0 € |
| AssemblyAI | 50 $ de crédits offerts (~185 h de transcription) | 0 € au début |
| Claude API (Haiku) | Paiement à l'usage, très faible pour la traduction | ~5 € |
| ElevenLabs | Abonnement d'entrée pour tester le doublage | ~5–22 $ |
| AWS (Remotion Lambda) | Paiement à l'usage. Mesuré le 2026-10-22 (Stockholm, 30 i/s) : vidéo de 12 s en 540×960 = **0,005 $**, 22 s, 19 fonctions ; **1 min en 1080×1920 (vidéo iPhone HEVC) = 0,104 $**, 95 s, 84 fonctions, fichier 41 Mo. Free plan : 100 $ de crédits AWS | ~5 € |
| Resend, Upstash, Sentry, PostHog | Gratuits | 0 € |
| Domaine | ~10–15 €/an | ~1 €/mois |

👉 Les prix changent : **vérifier chaque tarif avant de créer le compte**. Licence Remotion : gratuite pour les entreprises de 3 personnes ou moins (vérifier les conditions à jour).

## 2. Coûts IA de référence (à revérifier)

- Transcription AssemblyAI : ~0,37 $/heure → ~0,006 $/minute.
- Doublage ElevenLabs Dubbing v2 : à partir de ~2,20 $/minute de source → **c'est le poste le plus cher**.
- Traduction Claude Haiku : quelques centimes pour une vidéo entière.

**Optimisations testées (2026-10-22, rendu identique)** : copie de travail H.264 1080p = 0,079 $/min ; + 2 onglets et 60 images par machine = **0,070 $/min** (plancher AWS). Serveurs de rendu à prix fixe ≈ 0,01–0,03 $/min au-delà de ~1 000 min/mois (à chiffrer). Concurrent Caption Studio : 0,12–0,17 $/min vendu.

**Coût réel d'1 crédit (1 min sous-titrée + exportée en 1080p)** : ≈ 0,006 $ (transcription) + 0,104 $ (export) ≈ **0,11 $** (~65 FCFA). 10 crédits offerts ≈ 1,10 $ par compte qui les utilise tous.

## 3. Barème de crédits proposé (marge ≥ 50 % sur chaque fonction)

| Action | Crédits |
|---|---|
| Sous-titres animés (transcription + export) | 1 / minute |
| Traduction des sous-titres | 1 / minute / langue |
| Montage automatique | 1 / minute |
| Doublage | 20 / minute / langue |
| Recadrage automatique (suivi du sujet) | +1 / minute / format |
| Recadrage manuel | gratuit |
| Export 4K (plus tard) | +1 / minute |

## 4. Packs proposés (≈ 0,20 $/crédit, dégressif)

| Pack | Prix | Crédits |
|---|---|---|
| Gratuit | 0 | 10 (filigrane) |
| Starter | 9 $ | 50 |
| Creator | 24 $ | 150 |
| Pro | 59 $ | 400 |
| Studio | 129 $ | 1 000 |

Prix affichés en devise locale (EUR, USD, XOF, NGN, GHS, KES…). **À valider par Ashanti avant le code des paiements (T8.3).**
