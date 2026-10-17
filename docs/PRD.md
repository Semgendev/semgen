# PRD — SemGen Studio

## 1. Vision

Le studio de montage vidéo IA qui permet à **n'importe qui** — du débutant au monteur senior — de livrer une vidéo de niveau professionnel en **moins de 5 minutes** : sous-titres animés, traduction en un clic, montage automatique (silences, « euh », répétitions), doublage dans une autre langue. Disponible partout dans le monde, payable par carte **et** Mobile Money.

**Promesse :** « Ce qui prenait 5 heures prend 5 minutes. »

## 1b. Marque
- Nom complet : **SemGen Studio** · nom court : **SemGen** (prononcé « sem-djène »).
- Histoire : « Sem » vient du prénom du fondateur (Semelika), « Gen » pour génération.
- Slogan provisoire (à valider) : « Your vision. Generated. »
- Domaines visés : semgen.studio, semgen.com, semgen.ai (à vérifier).

## 2. Cibles (international, FR + EN)

1. **Monteurs freelances** (Fiverr, ComeUp, Upwork) : livrer plus vite, vendre plus de services.
2. **Créateurs de contenu** (TikTok, Reels, Shorts, YouTube, podcasts).
3. **Débutants** sans aucune compétence en montage.
4. **Agences / marques** (plus tard : plan équipe).

## 3. Concurrents à dépasser

Caption Studio, Submagic, Captions, OpusClip, Descript, CapCut, HeyGen.
**Nos avantages en V1 :** traduction des sous-titres en 1 clic **sans perdre le style ni la position**, montage automatique + recadrage intelligent + sous-titres + doublage **dans un seul outil**, langues et accents africains, paiement Mobile Money, design premium clair/sombre.

## 4. Périmètre V1 (validé par Ashanti le 17/10/2026)

| # | Fonctionnalité | Spécification |
|---|---|---|
| F1 | Comptes, connexion (email + Google), 10 crédits offerts | `features/01-auth-credits.md` |
| F2 | Upload vidéo + tableau de bord des projets | `features/02-upload-projects.md` |
| F3 | Transcription auto, **détection automatique de 99 langues**, plusieurs intervenants | `features/03-transcription.md` |
| F4 | Sous-titres animés : 20 styles premium + éditeur (texte, position, timing, mots forts) | `features/04-captions-editor.md` |
| F5 | **Traduction en 1 clic** vers 100+ langues, même timing, même position, même style | `features/05-translation.md` |
| F6 | **Montage automatique** : coupe des silences, « euh », bégaiements, répétitions et prises ratées | `features/06-auto-cut.md` |
| F7 | **Doublage IA** (90+ langues, voix et tempo conservés) | `features/07-dubbing.md` |
| F8 | Export 9:16 / 1:1 / 16:9, jusqu'en 1080p (4K plus tard), filigrane sur le plan gratuit | `features/04-captions-editor.md` |
| F9 | Paiements : cartes + Mobile Money (Orange, MTN, Moov, Wave…), packs de crédits | `features/08-payments.md` |
| F12 | **Recadrage intelligent** : passer de 16:9 à 9:16, 1:1, 4:5, 4:3, 21:9… en suivant automatiquement la personne qui parle | `features/10-reframe.md` |
| F10 | Mode clair / sombre, interface FR + EN, responsive (ordinateur, tablette, mobile) | `features/09-ui-ux.md` |
| F11 | Landing page, pages légales, emails | `features/09-ui-ux.md` |

## 5. Hors V1 (validé, à faire ensuite — voir `ROADMAP.md`)

- V2 : zooms auto, sound design auto, transitions, B-roll, détecteur de moments forts / clips, teaser de podcast, kit de marque, lien de validation client, espaces clients.
- V3 : étalonnage couleur avancé, motion design (plage choisie ou auto), score de rétention, miniatures/titres IA, montage par le texte.
- V4 : programmation de publications (TikTok, Instagram, YouTube, Facebook, LinkedIn) + analyse des stats avec résumé IA.
- V5 : application mobile native, avatars (avec consentement), marketplace de styles, affiliation, API.

## 6. Critères de qualité

- Vidéo de 1 min : transcription + sous-titres prêts en **< 60 s**, export en **< 2 min**.
- Aperçu dans l'éditeur **identique** à l'export (même composition Remotion).
- Lighthouse ≥ 90 (performance, accessibilité) sur la landing.
- Zéro faille critique à l'audit sécurité avant lancement.
- Fonctionne sur Chrome, Safari, Firefox, Edge — desktop, tablette, mobile.

## 7. Indicateurs à suivre

Inscriptions, activation (1ʳᵉ vidéo exportée), conversion gratuit → payant, revenus, coût IA par minute, rétention à J7 / J30.
