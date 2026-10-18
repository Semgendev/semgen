# Design — SemGen Studio

> Décisions d'Ashanti du 18/10/2026. Sources : `capture/design/` (brief, références, tokens, maquettes, captures Submagic et Caption Studio).
> Couleurs : D15. Licences : D14 et `CLAUDE.md` §10.

## 1. Direction choisie : « Studio sobre » + galerie vivante

Un mélange :
- **Base calme et précise**, comme Linear : fonds neutres, accents rares, tout aligné, pas de décor inutile.
- **Galerie vivante** pour les styles de sous-titres : des aperçus animés **sur la vidéo de l'utilisateur**.
- **Simplicité avant tout** : un débutant réussit en 3 gestes (importer → choisir un style → exporter). Les réglages fins (timeline, timing, position) sont cachés jusqu'à ce qu'on les demande.

## 2. Principes (du brief)
1. La vidéo est la vedette ; l'interface s'efface.
2. Transcription d'abord, timeline ensuite (repliable).
3. Un geste = un résultat, avec le **coût en crédits affiché avant**.
4. Preuve avant promesse : vrais résultats, aucun faux avis ni faux chiffre.
5. Clair et sombre aussi soignés l'un que l'autre, dans les 3 palettes.
6. Mouvement utile ; effets spectaculaires seulement sur la landing ; `prefers-reduced-motion` respecté.
7. Rapide : pas d'effets lourds dans l'éditeur.

## 3. Couleurs (D15)
- Fichiers : `src/styles/tokens.json` (référence) et `src/styles/tokens.css` (mêmes valeurs ; un test vérifie qu'ils sont identiques et que le contraste WCAG AA est respecté).
- 3 palettes × 2 modes : `data-palette="cobalt|etincelle|teal"` + classe `.dark` (next-themes). Cobalt & Or par défaut ; la landing reste toujours en Cobalt & Or.
- Classes Tailwind à utiliser : `bg-bg`, `bg-surface`, `bg-surface-2`, `text-text`, `text-text-2`, `text-text-3`, `border-border`, `border-border-strong`, `bg-brand`, `text-on-brand`, `text-brand-text`, `border-brand-border`, `bg-spark`, `text-on-spark`, `text-spark-text`, `text-success|warning|danger|info`. Les noms shadcn (`bg-primary`, `text-muted-foreground`…) pointent vers ces tokens.
- **Interdit** : toute couleur en dur dans `src/` (test automatique `no-raw-colors`).
- **Un seul bouton plein de marque par écran.** L'étincelle (`spark`) est réservée aux crédits, aux actions IA et aux mots mis en avant.
- Un état (succès, avertissement, erreur) = **icône + texte**, jamais la couleur seule.
- L'aperçu vidéo, les exports et les styles de sous-titres ne changent **jamais** avec la palette.

## 4. Typographie
| Usage | Police | Licence |
|---|---|---|
| Titres | **Plus Jakarta Sans** 600–800 (`font-heading`, automatique sur h1–h3) | OFL 1.1 |
| Texte d'interface | **Geist** (`font-sans`) | OFL 1.1 |
| Timecodes, chiffres techniques | **Geist Mono** (`font-mono`) | OFL 1.1 |
| Sous-titres vidéo (T4.x) | Montserrat, Poppins, Anton, Bebas Neue… + famille **Noto** pour arabe, cyrillique, devanagari, CJK | à vérifier une par une (OFL visé) |

Chargées par `next/font/google` (auto-hébergées au build, pas de dépendance npm).

## 5. Formes, densité, icônes
- Rayon : contrôles 10 px (`rounded-lg`), cartes et panneaux 14 px (`rounded-xl`), pastilles rondes.
- Densité : aérée dans les pages, plus serrée dans l'éditeur (panneaux).
- Cibles tactiles ≥ 44 px sur mobile.
- Icônes : **Lucide** (ISC) pour l'instant, une seule famille par écran. Hugeicons (pack gratuit, MIT) pourra être évalué plus tard, avec confirmation.

## 6. Mouvement
- Transitions de couleur ≤ 150 ms ; micro-interactions 150–250 ms ; Framer Motion pour les entrées de panneaux et la galerie.
- Tout est coupé si `prefers-reduced-motion: reduce`.

## 7. Écrans et structure
- **Éditeur** (desktop) : barre du haut (projet, annuler/rétablir, format, crédits, Exporter) · panneaux à gauche (Texte, Styles, Langues, Montage, Format, Audio) · **aperçu au centre (grand)** · transcription sous l'aperçu · inspecteur à droite · timeline repliable en bas. Voir `capture/semgen-design-references/visuels/02-maquettes-structure.png`.
- **Mobile** : éditeur simplifié en feuilles du bas (style, texte, langues, export) ; pas de timeline complète.
- **Paramètres › Apparence** : `/[locale]/settings/appearance` (3 cartes de palette avec mini-aperçu, 3 modes, enregistrement automatique sur l'appareil).
- **Page de test interne** : `/[locale]/dev/themes` (désactivée en production sauf `SEMGEN_DEV_PAGES=1`).

## 8. Ce qu'on fait mieux que la concurrence (observé sur leurs écrans)
- Aperçu **grand** (Caption Studio : aperçu minuscule au milieu du vide).
- Boutons et libellés **jamais coupés**, textes prévus 40 % plus longs pour les traductions.
- Styles essayés **sur la vidéo de l'utilisateur**, pas sur des vignettes génériques.
- **Aperçu instantané** de la vidéo dès qu'elle est choisie, pendant que l'envoi continue (voir D17).
- Pas de styles verrouillés au lancement : tout se paie en crédits (D18, révisable).
- Traduction en 1 clic, langues africaines, Mobile Money, coût affiché avant chaque action.

## 9. Tests
- `tests/unit/tokens.test.ts` : contraste AA des 6 thèmes + CSS identique au JSON.
- `tests/unit/no-raw-colors.test.ts` : aucune couleur en dur dans `src/`.
- `tests/unit/palette.test.ts` + `tests/e2e/palette.spec.ts` : choix, cookie, rechargement sans flash, landing en Cobalt.
- À venir : matrice de captures Playwright (3 palettes × 2 modes × 390/768/1440 px) sur les écrans clés.
