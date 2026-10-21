# Analyse des vidéos de référence v14 à v17

Notes : les 4 vidéos sont des démos "Avant / Après" (petite vidéo "Avant" à gauche, grande vidéo "Après" avec les sous-titres animés). Je ne re-décris pas les 12 styles déjà faits ; je signale les ressemblances. Tout ce qui est incertain est marqué "incertain". Les polices sont identifiées par leur dessin (pas de certitude absolue).

---

## v14 : johnogwum (21 s) : coach, style "néon vert acide"

(1) Une femme parle face caméra. Petites phrases blanches avec un MOT FORT géant vert acide lumineux, plus des habillages (cadre de visée, liste à cocher, icônes, barres de montage, bulles de message) qui illustrent ce qu'elle dit.

### Style A : "Neon Key Word" (phrase fine + mot clé néon)
- Position : centre-bas (au niveau de la poitrine), centré.
- Mots : la phrase d'appui s'affiche par groupes de 2 à 5 mots ; le mot clé est isolé en grand (1 à 3 mots : "AVA JUERGENS", "EDITORS", "The Editing Test", "PersonalBrandLaunch").
- Mise en forme : phrase d'appui toute petite (environ 15 à 20 % de la taille du mot clé), sans-serif fin, casse normale, blanc. Mot clé : très grand, très gras, condensé ; MAJUSCULES pour "AVA JUERGENS" / "EDITORS", casse mixte pour "The Editing Test".
- Police du mot clé : sans-serif condensée très grasse, lettres hautes et serrées. Proches libres : **Anton**, **Oswald Bold**, **League Gothic** (OFL) ; Bebas Neue si majuscules seulement. Origine : probablement commerciale type "Druk Condensed" (incertain). Phrase d'appui : **Inter** / **Poppins Medium** (OFL).
- Couleurs : appui blanc (#FFFFFF) ; mot clé vert-jaune acide (~#C6FF1A à #D4FF2A) avec contour fin olive foncé (~#7A9A00) ; LUEUR verte autour (~#B6FF00, flou 12-20 px) ; légère ombre sombre dessous. Pas de pastille.
- Entrée : phrase d'appui mot par mot en fondu rapide + minuscule glissement vers le haut ; mot clé en "pop" (échelle ~0,85 vers 1,05 vers 1) avec flou qui se précise et lueur qui s'allume. Sur "PersonalBrandLaunch" un arc vert se dessine autour de la personne (incertain sur le détail).
- Sortie : fondu court (~0,2 s) ; la phrase suivante remplace.
- Mot actif : le mot clé est l'accent (taille x3-4, couleur néon, lueur) ; les autres mots restent blancs et petits.
- Effets : lueur néon, vignettage sombre de la vidéo quand le mot clé apparaît (pour faire briller la lueur), cadre de visée blanc (4 coins) sur le visage au tout début.
- Rythme : 0,4 à 1,2 s par groupe ; mot clé 0,8 à 1,5 s.
- Déjà couvert par : partiellement "Or liquide" (mot fort lumineux) et "Impact rouge" (condensé gras). NOUVEAU : phrase fine blanche + mot clé géant néon vert à lueur colorée + vignettage sombre.
- Difficulté : MOYEN. Glow (text-shadow multi-couches) + échelle/flou : facile. Plus dur : choisir automatiquement le mot clé (IA) et le vignettage synchronisé.
- Qualité premium : contraste d'échelle extrême, lueur colorée, fond assombri, jamais plus de 3 mots en grand.

### Style B : "UI Callouts" (habillages sémantiques)
- Position : centre de l'écran.
- Pas un sous-titre classique : une liste à cocher apparaît (curseur main blanc qui clique 3 lignes "Talented / Hardworking / Committed", petite case verte, texte vert acide sur bande translucide), des pastilles rondes avec photos à contour néon à la place d'un mot, 3 barres de timeline colorées (magenta, bleu clair, vert menthe), une notification grise et des bulles de chat bleu ciel.
- Police : sans-serif UI (**Inter**, OFL), petite.
- Entrée : cascade ligne par ligne, curseur qui se déplace et clique, bulles qui glissent vers le haut avec petit rebond.
- Difficulté : DIFFICILE (dépend du sens du texte). Seuls pastilles rondes à contour néon et liste à cocher sont faciles. À considérer comme optionnel.

---

## v15 : makeinnovationsmedia (30 s) : texte géant fondu dans l'image

(1) Une jeune femme en pull marron parle dans un studio ; entre deux, des plans illustratifs sur fond papier froissé (poignée de main, foule, ordinateur, graphique). Le texte est ENORME et mélangé à l'image.

### Style C : "Blend Stack"
- Position : tiers inférieur sur la vidéo (poitrine/taille), aligné à gauche ou centré ; sur les plans illustratifs, plus haut et pleine largeur.
- Mots : empilement de 2 à 4 lignes, chaque ligne de 1 à 3 mots ("In / 2025", "Fail / your business", "No loyal / community", "building / trust / or a").
- Mise en forme : MINUSCULES (casse de phrase), tracking très serré (lettres qui se touchent), un mot clé 3 à 5 fois plus grand que les autres, lignes secondaires bien plus petites en dessous ; graisse Bold/ExtraBold ; alignement à gauche avec décalage en escalier.
- Police : sans-serif géométrique grasse, "a" à deux étages, "g" à un étage, "y" droit. Libres : **Plus Jakarta Sans ExtraBold**, **Poppins Bold**, **Outfit Bold**, **Figtree**, **Manrope ExtraBold** (OFL). Origine : ressemble à Gilroy/Circular (commerciales, incertain). Tracking à régler autour de -4 à -6 %.
- Couleurs : sur vidéo : rose poudré pâle semi-transparent (~#F2C4CB, opacité ~85 %) ; "Fail" en rouge vif texturé (~#E3122C) ; sur fond blanc des plans illustratifs : vert sapin très foncé (~#0E3B36), rose clair (~#F5B8C4) là où le mot croise la zone noire, gris-vert clair (~#9BB5B0) pour les mots qui arrivent. Pas de contour, pas de boîte.
- EFFET CLÉ 1 : texte mélangé avec l'image (blend type overlay/soft light + opacité) : on voit les détails de la vidéo (plis du pull) à travers les lettres ; "2025" et "Fail" paraissent texturés.
- EFFET CLÉ 2 : texte DERRIÈRE le sujet (occlusion) : le micro et les mains passent devant les lettres ("don't bother", "to generate"). Demande un masque de personne (segmentation). Sur le plan poignée de main, le mot passe aussi derrière la silhouette.
- EFFET CLÉ 3 : couleur ADAPTATIVE : un même mot est vert foncé sur le blanc et rose sur le noir ("loyal" a son "y" moitié vert moitié rose, "lead" a son "d" rose) = inversion selon l'arrière-plan (masque / mix-blend-mode).
- Entrée : mot par mot, fondu depuis sombre/transparent + glissement + léger zoom (0,9 vers 1) ; le mot clé géant claque plus fort (flou de mouvement vertical, incertain). Les lignes secondaires s'AJOUTENT dessous au fur et à mesure (cumul), sans remplacement.
- Sortie : bloc entier en fondu rapide (~0,2 s).
- Mot actif : pas de surlignage séparé ; le mot clé géant est l'accent.
- Rythme : très rapide, 0,25 à 0,5 s par mot ; phrase complète 1,5 à 3 s.
- Déjà couvert par : "Éditorial" / "Convergence" ressemblent un peu (empilement, tailles mixtes). NOUVEAU : blend avec l'image, occlusion derrière le sujet, couleur qui s'inverse selon le fond, minuscules ultra-serrées.
- Difficulté : DIFFICILE pour l'occlusion (masque de personne par image : MediaPipe/segmentation, coûteux en rendu). MOYEN pour blend + tracking serré + empilement + couleur adaptative (calque dupliqué avec masque de luminosité). Version "sans occlusion" = FACILE.
- Qualité premium : impression que le texte est dans la scène, hiérarchie de tailles extrême, palette limitée rose / vert sapin très éditoriale.

---

## v16 : rovixstudios (12 s) : espagnol, deux styles selon le fond

(1) Une femme parle à la caméra ; entre deux, des plans d'illustration sur fond clair (téléphone, billets). Texte discret et fin.

### Style D : "Soft Lowercase Fade" (sur la vidéo)
- Position : centre-bas, au niveau de la poitrine, centré.
- Mots : 1 à 4 mots, la phrase se construit mot à mot et reste jusqu'à la suivante ("Quiero" puis "Quiero saber" ; "pero me" puis "pero me da" puis "pero me da roche").
- Mise en forme : petit, minuscules / casse de phrase, regular, blanc.
- Police : grotesque neutre type Helvetica/Inter. Libres : **Inter**, **Hanken Grotesk**, **DM Sans** (OFL). Origine : Helvetica Neue / SF Pro (système, incertain).
- Couleurs : blanc (#FFFFFF) ; le mot qui vient d'arriver est plus pâle/grisé (~#BFBFBF) puis passe au blanc ; ombre diffuse sombre ; le bas de la vidéo est légèrement assombri derrière le texte.
- Entrée : mot par mot, fondu doux avec micro-flou. Sortie : toute la phrase s'efface en fondu.
- Déjà couvert par : "Minimal" en partie. NOUVEAU : construction progressive + mot actif plus pâle + bas de l'image assombri.
- Difficulté : FACILE. Qualité : sobriété, très peu de texte, lisible.

### Style E : "Magenta Ticker" (sur fonds blancs / plans illustratifs)
- Position : milieu de la carte, une seule ligne.
- Mots : 3 à 6 mots ; la ligne défile horizontalement vers la gauche ("si esto me pasa solo a mi" repoussé à gauche) ; la fin de phrase passe en gras italique ("cuánto me queda.", "cuenta del banco.").
- Mise en forme : minuscules, très petit (environ 2 % de la hauteur), regular, puis SemiBold Italic pour l'accent ; "Abrir mi" petit puis "cuenta del banco." plus gros.
- Police : sans-serif géométrique + italique. Libres : **Poppins** (Regular + SemiBold Italic), **Plus Jakarta Sans Italic**, **Montserrat Italic** (OFL).
- Couleurs : fuchsia/magenta (~#D93FD0 à #E040E0), mots à venir plus clairs (~#F0A8EE) ; fond blanc-bleuté (~#EAF2FB).
- Entrée : mot par mot en fondu ; défilement horizontal continu. Un anneau rose se dessine autour du mot "a mi" (cercle animé de mise en valeur).
- Sortie : la phrase se dissout, le plan suivant arrive en flou + fondu.
- Difficulté : FACILE à MOYEN (ticker + cercle SVG animé stroke-dashoffset).
- Qualité : énormément de vide autour d'un texte minuscule = look luxe ; magenta sur blanc.

Autres éléments (non sous-titres) : icônes/emojis dans pastilles blanches arrondies (caddie, pizza, téléphone), billets qui tombent : illustrations, DIFFICILE / hors sujet.

---

## v17 : wesleycosta (46 s) : portugais, "sans gras + serif italique"

(1) Podcast d'une femme avec micro, plans b-roll courts ; sous-titres en deux couches : texte simple petit + accent mot clé / italique serif élégant. Planches extraites à 26, 30, 34, 38, 42 et 45 s : seulement le style F (aucun nouveau style).

### Style F : "Plain Lowercase"
- Position : centre, sous le menton (~63-65 % de la hauteur), centré.
- Mots : 1 à 3 mots, changement quasi instantané avec micro fondu.
- Mise en forme : petit, casse de phrase avec ponctuation, medium, sans-serif propre, blanc, pas de contour, ombre diffuse très douce.
- Police : **Inter Medium**, **Instrument Sans**, **Albert Sans** (OFL). Origine : Inter / Helvetica (incertain).
- Déjà couvert par : "Minimal". NOUVEAU : rien, sert de base calme entre deux accents.
- Difficulté : FACILE.

### Style G : "Sans + Italic Serif Duo"
- Position : même ligne que F ; l'accent s'étage sur 2-3 lignes (mot gras puis mot italique plus bas, un peu décalé à droite).
- Mots : 2 à 3 niveaux ("fulano da / CONTA", "constância / RESULTADO / que gera", "você / Acaso / por", "encontra / VARIEDADES / de contexto", "que você esteja / QUERENDO / desenvolver", "própria / comunicação").
- Mise en forme : (1) petit mot d'appui sans-serif regular blanc ; (2) mot clé ~2x plus grand, sans-serif très gras serré ; (3) mot secondaire en italique serif fin à forts contrastes.
- Police mot clé : grotesque très grasse et serrée type Gilroy/Satoshi Black (commerciales, incertain). Libres : **Plus Jakarta Sans ExtraBold**, **Poppins Bold**, **Manrope ExtraBold**, **Bricolage Grotesque** (OFL). Police italique : serif contrasté à déliés très fins : **Instrument Serif Italic**, **Playfair Display Italic**, **Cormorant Garamond Italic**, **Fraunces Italic** (OFL). Origine probable : Playfair / Canela / Ivar (incertain, certaines commerciales).
- Couleurs : appui blanc ; mot clé crème/jaune pâle (~#F5E9B8) avec lueur chaude beige-dorée douce ; italique doré/crème (~#EBD9A0) un peu transparent ; étiquettes jaunes ("DEPOIS", "PACK NA DESCRIÇÃO", ~#FFC83A, condensée grasse) = habillage hors sous-titre.
- Entrée : le mot clé arrive avec FLOU qui se précise (blur-in fort, opacité 0 vers 1, zoom 1,1 vers 1) et lueur qui fond ; l'italique arrive ~0,2 s après avec un fondu plus lent et un petit glissement vers le haut ; nouvelle ligne ajoutée sous la précédente.
- Sortie : fondu rapide ; sur fond sombre brumeux (plan "texte seul", ex. "que você esteja querendo desenvolver"), même duo, plus longtemps, qui se dissout en flou.
- Mot actif : accent par taille + changement de police (sans gras vs serif italique) + lueur, pas par couleur changeante.
- Rythme : mot clé 0,6 à 1 s ; italique 0,3 s après.
- Déjà couvert par : "Élégance" / "Éditorial" (serif + sans) probablement ; NOUVEAU : duo sans gras + serif italique dans la même phrase, empilé et décalé, arrivée en flou + lueur crème. Si "Éditorial" fait déjà ce mélange, c'est une variante.
- Difficulté : MOYEN (blur-in + glow = facile ; choix des mots et mise en page à 3 niveaux par IA = la partie dure).
- Qualité premium : contraste de polices, lueur chaude douce, retenue (un seul accent par phrase).

---

## Résumé : styles uniques trouvés

1. **Neon Key Word** : petite phrase blanche + mot clé géant condensé vert acide avec lueur et vignettage (v14).
2. **UI Callouts** : liste à cocher, curseur, pastilles photo à contour néon, bulles de chat, barres à la place d'un mot (v14) ; difficile, optionnel.
3. **Blend Stack** : mots empilés en minuscules ultra-serrées, mot clé géant, texte fondu avec l'image, derrière le sujet, couleur qui s'inverse selon le fond (v15).
4. **Soft Lowercase Fade** : petit blanc, construction mot à mot, dernier mot plus pâle, bas de l'image assombri (v16) ; proche de "Minimal".
5. **Magenta Ticker** : ligne magenta minuscule qui défile, fin en gras italique, cercle dessiné autour d'un mot (v16).
6. **Sans + Italic Serif Duo** : mot clé sans gras crème à lueur + mot serif italique doré, flou qui se précise (v17).
7. **Plain Lowercase** : petit blanc simple (v16, v17) ; déjà couvert par "Minimal".

Total : 6 styles nouveaux (1 à 6) + 1 déjà couvert (7).

## Polices à ajouter (toutes OFL, Google Fonts)

| Police | Usage | Licence | Lien |
|---|---|---|---|
| Anton | mot clé condensé néon (v14) | OFL | https://fonts.google.com/specimen/Anton |
| Oswald | alternative condensée (v14) | OFL | https://fonts.google.com/specimen/Oswald |
| League Gothic | casse mixte condensée (v14) | OFL | https://fonts.google.com/specimen/League+Gothic |
| Plus Jakarta Sans | gras serré (v15, v17) | OFL | https://fonts.google.com/specimen/Plus+Jakarta+Sans |
| Poppins | Blend Stack / ticker (v15, v16) | OFL | https://fonts.google.com/specimen/Poppins |
| Manrope | alternative gras serré | OFL | https://fonts.google.com/specimen/Manrope |
| Bricolage Grotesque | mot clé gras expressif (v17) | OFL | https://fonts.google.com/specimen/Bricolage+Grotesque |
| Inter | petit texte propre (v14, v16, v17) | OFL | https://fonts.google.com/specimen/Inter |
| Instrument Serif (Italic) | italique serif (v17) | OFL | https://fonts.google.com/specimen/Instrument+Serif |
| Playfair Display (Italic) | italique serif contrasté (v17) | OFL | https://fonts.google.com/specimen/Playfair+Display |
| Cormorant Garamond (Italic) | italique serif fin (v17) | OFL | https://fonts.google.com/specimen/Cormorant+Garamond |
| Fraunces (Italic) | italique serif doux (v17) | OFL | https://fonts.google.com/specimen/Fraunces |

Polices d'origine probablement commerciales (ne pas utiliser) : Druk-like (v14), Gilroy/Circular (v15, v17), Canela/Ivar (v17), Helvetica Now / SF Pro (v16, v17). Identifications incertaines.
