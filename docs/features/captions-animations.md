# Sous-titres animés — cahier des charges et analyse de la référence

> Copie de `capture/semgen-design-references/06-…` et `08-…` (le dossier `capture/` n'est pas suivi par git). Visuel : `docs/features/img/animation-basique-vs-pro.png`.
> **Règle de timing ajoutée le 2026-10-19 (retour d'Ashanti : « ça vient vite, ça disparaît vite »)** : texte affiché 120 ms avant la voix ; page qui reste jusqu'à la suivante si le silence fait moins de 1,5 s ; 0,9 s minimum à l'écran ; sortie seulement après le dernier mot ; pas de page d'un seul mot ; mot actif allumé sans coupure entre deux mots ; lecteur en pause quand la vidéo charge. Code : `src/features/captions/paginate.ts`, `motion.ts`.

---

## Animations de texte « niveau studio » — cahier des charges SemGen Studio

> **Besoin d'Ashanti (18/10/2026).** Il ne veut **aucune animation basique** (un simple fondu ou un « pop » linéaire). Il veut le niveau des motion designers qui font de grandes animations de texte dans **After Effects, Premiere Pro, DaVinci Resolve, Final Cut / Motion** : ressorts avec dépassement, décalage mot par mot, flou de mouvement, masques, 3D, effets lumineux, glitch… **le tout en un clic**, pour quelqu'un qui n'est pas motion designer. Plus il y a de styles et plus ils sont détaillés, mieux c'est.
> **Contexte technique :** les animations sont rendues par **Remotion** (un seul composant, aperçu = export, voir `docs/ARCHITECTURE.md`). Les mots et leurs instants viennent d'AssemblyAI (mot par mot, en millisecondes).
> **Règle de licence inchangée :** voir `03-COMPOSANTS-ET-LICENCES.md`. On code **nos propres** animations. On n'embarque aucun preset After Effects, aucun MOGRT, aucun Lottie « communautaire » ni aucune police sans licence libre (§8).
> Visuel : `visuels/03-animation-basique-vs-pro.png` (même texte, animation basique contre animation pro).

### 0. En 12 lignes

1. **Animation = données, pas du code par style.** Chaque style est un **preset JSON** (validé par Zod) décrit par : mise en page, entrée, emphase (mot actif), sortie, couleurs, effets. Un seul moteur le lit. Ajouter un style = ajouter un fichier JSON, pas réécrire du code.
2. **Mise en page figée, animation par transformations.** On calcule une fois la position de chaque mot, puis on n'anime que `transform`/`opacity`/`filter`. Sinon le texte « saute » quand un mot grossit (défaut typique d'outils amateurs).
3. **Des ressorts, jamais de linéaire.** Dépassement de 5 à 12 %, retour fluide. Courbes : ressort (`spring`) et `cubic-bezier` « expo » / « back ».
4. **Décalage (stagger) par mot et par caractère**, dans plusieurs directions (gauche→droite, du centre vers l'extérieur, aléatoire **à graine fixe**).
5. **Flou de mouvement** (angle d'obturateur 180°) sur les mouvements rapides : c'est ce qui sépare un rendu « After Effects » d'un rendu « web ».
6. **Aléatoire seulement avec une graine** : le même projet doit donner exactement les mêmes images dans l'aperçu et dans l'export.
7. **Arabe, hindi, thaï… : animer par mot, pas par lettre** (une animation par caractère casse les liaisons des lettres). Voir §5.
8. **Pas de clignotement dangereux** : jamais plus de 3 flashs par seconde (§6).
9. Le catalogue du §3 propose **36 styles dans 10 familles**. 27 sont candidats à la V1 (repérés « V1 »), dont on **garde 20** ; le reste est « V2 / Premium ».
10. **On valide d'abord 5 prototypes** (un par famille) avec Ashanti, **avant** de produire les 20 styles. Ordre de travail au §9.
11. **Ce que j'ai vu de Caption Studio** : seulement sa page publique (§1). Son application n'a pas pu être ouverte : Ashanti doit fournir une **vidéo d'écran** (§9).
12. Les noms de styles sont **les nôtres** : on ne reprend ni les noms, ni les présets, ni le look exact d'un concurrent ou d'une personne réelle (§8).

### 1. Ce qui est connu de Caption Studio (honnêteté)

- **Lu** (page publique captionstudioo.com, 18/10/2026) : cinq styles nommés — *Viral, Cinéma, Néon, Minimaliste, Gras centré* — et « +7 autres styles dans l'éditeur » (non nommés). Animation mot par mot synchronisée avec la voix, **mots forts** réglables, contour/dégradé/animations conservés à l'export, kit de marque (offre Studio). Aucune liste détaillée des types d'animation.
- **Mise à jour :** l'application a ensuite été analysée de l'intérieur (13 styles, 10 animations d'entrée, Deep Glow, Light Sweep, dégradés, rôle « mot fort », avance du texte, son lié au texte…). **Tout est dans `08-ANALYSE-CAPTION-STUDIO.md`**, avec le tableau « ce qu'on fait mieux ». Les fonctions du §4 de ce fichier `08` s'ajoutent au moteur décrit ici.
- **Tout ce qui est écrit ici sur les autres produits vient de pages publiques** ; rien n'est copié.

### 2. La boîte à outils du moteur (les primitives)

#### 2.1 Sélection du texte à animer (équivalent des « sélecteurs de plage » d'After Effects)
- **Unité :** caractère, mot, ligne, page entière (voir §5 pour les alphabets).
- **Décalage (stagger) :** délai = index × `delaiImages`. Valeurs de départ : 2–4 images par mot, 1–2 par caractère (à 30 i/s).
- **Direction :** gauche→droite, droite→gauche, centre→extérieur, extérieur→centre, **aléatoire à graine**, par taille de mot.
- **Forme de la transition entre éléments :** rampe, carré, triangle, « ease haut / ease bas » (comme After Effects : *Shape*, *Ease High*, *Ease Low*).
- **Mot actif :** le mot prononcé à l'instant `t` reçoit l'animation d'**emphase** ; les mots déjà dits ont un état « dit » ; les suivants un état « à venir ».

#### 2.2 Propriétés animables
Position (x, y), échelle, rotation 2D, **rotation 3D** (avec perspective), opacité, **flou**, **espacement des lettres (tracking)**, inclinaison (skew), **couleur et dégradé**, épaisseur du **contour**, **ombre / lueur** (plusieurs couches), **masque de révélation** (`clip-path`), **graisse de la police** (police variable), décalage de la ligne de base, **filtres** (aberration chromatique, déplacement turbulent).

#### 2.3 Courbes de mouvement
- **Ressort** (`spring`) : raideur, amortissement, masse. Points de départ à régler à l'œil : *pop* `raideur 220 / amortissement 14 / masse 0,6` ; *doux* `120 / 18 / 1` ; *claquement* `300 / 12 / 0,5`. (Valeurs indicatives : Claude Code les ajuste en regardant l'aperçu image par image.)
- **Courbes nommées :** `easeOutExpo`, `easeOutBack` (avec force de dépassement), `easeInOutCubic`, élastique, rebond.
- **Règle :** entrée **rapide au début, douce à la fin** ; sortie **plus courte que l'entrée**.

#### 2.4 Qualité de mouvement
- **Flou de mouvement** : plusieurs échantillons dans le temps par image, angle 180°, activé seulement quand la vitesse dépasse un seuil.
- **Vibration (wiggle)** et bruit : toujours avec **graine** (bruit de Perlin à graine fixe).
- **Parallaxe** : couches (ombre, texte, accent) légèrement décalées à des vitesses différentes.
- **Synchronisation à l'audio** : l'impact de l'animation (le « claquement ») tombe sur le **début du mot** (+0 à −3 images d'avance, à tester) ; option « pulsation selon le volume ».

#### 2.5 Durées de départ (à 30 images par seconde)
| Élément | Durée |
|---|---|
| Entrée d'un mot | 8 à 14 images (≈ 270–470 ms), dépassement compris |
| Emphase du mot actif | 6 à 10 images |
| Sortie d'une page de sous-titres | 4 à 8 images |
| Page de sous-titres | 3 à 6 mots, 2 lignes maximum, ≤ 42 caractères par ligne |

### 3. Catalogue : 36 styles dans 10 familles

**Légende :** V1 = à faire dans les 20 styles de départ · V2 = après · ⭐ = difficulté (1 simple … 5 très avancé) · **Perf** = coût de rendu (🟢 léger, 🟡 moyen, 🔴 lourd : prévoir une version allégée). Les noms sont des noms de travail à nous.
Pour chaque style : **Rendu** → **Comment les pros le font** (AE = After Effects, DR = DaVinci Resolve/Fusion, PP = Premiere Pro, FCP = Final Cut / Motion) → **Chez nous** (Remotion) → **Réglages exposés** à l'utilisateur.

#### Famille A — Viral mot par mot (shorts, reels)
1. **Pop à ressort** (V1 ⭐⭐ 🟢) — chaque mot apparaît en grossissant de 60 % à 100 % avec un dépassement à 108 %, le mot actif change de couleur.
   AE : animateur Échelle + Opacité, sélecteur d'expression pour le décalage, expression de dépassement. PP : MOGRT, paramètres du texte. DR : Text+ avec modificateur *Follower*. FCP/Motion : comportement *Overshoot* + *Sequence Text*.
   Chez nous : `spring()` par mot, état « actif ». Réglages : couleur du mot actif, force du dépassement, vitesse.
2. **Claquement d'impact** (V1 ⭐⭐⭐ 🟡) — le mot clé arrive à 160 % et se pose en 4 images, avec un tremblement de 2–4 px pendant 3 images et un léger flash de contraste.
   AE : échelle avec courbes de vitesse + *Wiggle* à graine + éclair en mode d'incrustation. Chez nous : ressort « claquement » + bruit à graine + flash `mix-blend-mode`. Réglages : intensité du tremblement, flash on/off (**voir §6**).
3. **Montée avec flou** (V1 ⭐⭐ 🟢) — le mot monte de 24 px depuis le bas, flou 8 → 0, opacité 0 → 1 ; texte en **majuscules** gras, ombre portée marquée ; **mots forts** en couleur vive.
   AE : animateur Position Y + Flou + Opacité. Chez nous : `translateY` + `filter: blur()` + opacité, flou de mouvement. Réglages : distance, flou, mots forts.
4. **Pile à deux lignes** (V1 ⭐⭐⭐ 🟢) — 2 lignes ; la ligne active est plus grande et lumineuse, la ligne précédente remonte et s'atténue ; nouvelle ligne = glissement + fondu.
   Chez nous : mise en page figée, transformations par ligne. Réglages : contraste entre lignes, vitesse de remontée.

#### Famille B — Karaoké / suivi de lecture
5. **Remplissage karaoké** (V1 ⭐⭐⭐ 🟡) — la couleur « remplit » chaque mot de gauche à droite en suivant la voix (dégradé net avec bord doux).
   AE : masque de piste (*Track Matte*) animé, ou dégradé animé. DR : Text+ avec deux couches et un masque en rectangle. Chez nous : texte en double, couche colorée avec `clip-path` animé selon la **durée exacte** du mot. Réglages : couleur avant/après, bord doux.
6. **Surligneur de marqueur** (V1 ⭐⭐⭐ 🟢) — un rectangle de surligneur (bords légèrement irréguliers) se dessine derrière le mot en 6–8 images.
   AE : forme + *Trim Paths* + masque rugueux. Chez nous : SVG avec masque, `scaleX` 0 → 1. Réglages : couleur, inclinaison, rugosité.
7. **Boîte glissante** (V1 ⭐⭐⭐⭐ 🟡) — une boîte arrondie **glisse** d'un mot à l'autre en changeant de largeur (interpolation à ressort de la position et de la taille).
   AE : calque de forme lié aux marqueurs de texte (expressions). Chez nous : positions des mots précalculées + `spring()` sur x et largeur. Réglages : rayon, couleur, ombre, élasticité.
8. **Soulignement dessiné** (V2 ⭐⭐⭐ 🟢) — un trait se trace sous le mot actif, tracé à la main.
   AE : *Trim Paths*. Chez nous : tracé SVG (`@remotion/paths`, à vérifier). Réglages : épaisseur, couleur, style de trait.

#### Famille C — Cinéma / éditorial
9. **Fondu avec espacement qui s'ouvre** (V1 ⭐⭐ 🟢) — espacement des lettres 30 % → 5 %, flou léger, opacité 0 → 1 ; police à empattements, minuscules, élégante.
   AE : animateur *Tracking*. Chez nous : calcul d'espacement figé + transformations (voir §0 point 2). Réglages : amplitude, police.
10. **Révélation par masque de ligne** (V1 ⭐⭐⭐ 🟢) — le texte monte **depuis derrière une ligne invisible** (masque) ; décalage par ligne.
    AE : masque + animateur Position. Chez nous : conteneur `overflow: hidden` + translation. Réglages : direction, décalage.
11. **Mélange de polices** (V1 ⭐⭐⭐ 🟢) — le mot fort passe en **italique à empattements** pendant que le reste reste en sans-serif (contraste typographique chic).
    Chez nous : deux polices, pré-mesure du texte. Réglages : paire de polices.
12. **Sous-titres de film** (V1 ⭐ 🟢) — fondu enchaîné très discret, blanc, ombre fine, position bas. Le « bon » sobre.

#### Famille D — Néon / lumineux
13. **Néon qui vacille** (V1 ⭐⭐⭐ 🟡) — lueur à plusieurs couches (couleur vive + halo), léger vacillement à graine à l'apparition.
    AE : *Glow* + animation d'opacité aléatoire à graine. Chez nous : `text-shadow` multicouche. **Respecter §6** (pas plus de 3 flashs/s). Réglages : couleur, intensité, vacillement.
14. **Balayage de lumière** (V1 ⭐⭐⭐ 🟡) — un reflet diagonal traverse le texte (effet « métal / verre »).
    AE : *CC Light Sweep*. Chez nous : dégradé animé en `background-clip: text`. Réglages : angle, vitesse, intensité.
15. **Pulsation sur le volume** (V2 ⭐⭐⭐⭐ 🟡) — la lueur et l'échelle suivent l'énergie de la voix.
    Chez nous : analyse de l'audio (`@remotion/media-utils`, à vérifier) → courbe de volume lissée. Réglages : sensibilité.

#### Famille E — Glitch / technologie
16. **Séparation RVB** (V1 ⭐⭐⭐ 🟡) — trois copies rouge/verte/bleue décalées de quelques pixels qui se rejoignent sur le mot (aberration chromatique), surtout à l'entrée et sur les mots forts.
    AE : canaux séparés + mode d'incrustation *Écran*. Chez nous : 3 couches + `mix-blend-mode: screen`. **Respecter §6.** Réglages : écart, durée.
17. **Décodage / brouillage** (V1 ⭐⭐⭐ 🟢) — les lettres défilent parmi des caractères aléatoires avant de se fixer sur le bon mot.
    AE : expression de texte source. Chez nous : suite de caractères **à graine**. Réglages : jeu de caractères, durée.
18. **Tranches décalées** (V2 ⭐⭐⭐⭐ 🟡) — le mot est coupé en bandes horizontales qui se décalent puis se recollent.
    Chez nous : `clip-path` par bande + translations à graine. Réglages : nombre de bandes, amplitude.
19. **Machine à écrire + curseur** (V1 ⭐⭐ 🟢) — les lettres s'écrivent, curseur clignotant, police monospace (style terminal).
    AE : *Écrire* / animateur Opacité par caractère. Chez nous : lettres révélées selon le temps de parole. Réglages : curseur, police.

#### Famille F — 3D et profondeur
20. **Retournement 3D de mot** (V1 ⭐⭐⭐ 🟡) — le mot pivote autour de l'axe horizontal (rotation X de −90° à 0°) avec perspective, comme un tableau d'affichage.
    AE : calque 3D + caméra. Chez nous : CSS 3D (`perspective`, `rotateX`). Réglages : axe, perspective.
21. **Extrusion 3D** (V2 ⭐⭐⭐⭐⭐ 🔴) — texte avec épaisseur, éclairé, légère rotation de caméra.
    AE : moteur 3D / Element 3D. DR : Fusion 3D. FCP/Motion : texte 3D. Chez nous : `three.js` (MIT) via `@remotion/three` (à vérifier). **Premium** : prévoir une version « fausse extrusion » légère (couches empilées).
22. **Parallaxe multicouche** (V2 ⭐⭐⭐⭐ 🟡) — ombre décalée, texte, accent lumineux se déplacent à des vitesses différentes, légère rotation de caméra.
23. **Défilement vertical de mot** (V1 ⭐⭐⭐ 🟢) — le mot est remplacé par le suivant en défilant verticalement (compteur / machine à sous).
    Chez nous : fenêtre masquée + translation. Réglages : sens, vitesse.

#### Famille G — Liquide / organique
24. **Vague flottante** (V1 ⭐⭐ 🟢) — chaque lettre monte et descend en vague (déphasage par index), très doux.
    AE : sélecteur ondulant (*Wiggly*) ou expression sinus. Chez nous : sinus déphasé. Réglages : amplitude, vitesse.
25. **Mise au point** (V1 ⭐⭐ 🟢) — flou 20 → 0 avec légère échelle 110 % → 100 % (le texte « prend le point »).
26. **Dissolution liquide** (V2 ⭐⭐⭐⭐ 🔴) — le mot se forme par déformation turbulente (filtre SVG `feTurbulence` + `feDisplacementMap`).
    AE : *Turbulent Displace*. **Perf** : coûteux, prévoir version allégée. Réglages : force, durée.

#### Famille H — Mots forts, émojis, tampons
27. **Mot fort = couleur + pop + émoji** (V1 ⭐⭐ 🟢) — le mot-clé grossit, change de couleur et un émoji apparaît à côté avec un petit rebond. **Émojis statiques sous licence libre** (ex. Noto Color Emoji), animés par nous.
28. **Tampon** (V1 ⭐⭐⭐ 🟡) — le mot s'écrase comme un tampon : rotation −8°, échelle 150 % → 100 %, texture d'encre.
29. **Cercle / flèche dessinés** (V2 ⭐⭐⭐ 🟢) — un cercle ou une flèche se trace autour du mot (tracé SVG animé).
30. **Secousse émotionnelle** (V1 ⭐⭐ 🟢) — les mots d'émotion (« incroyable », « fou ») vibrent légèrement (bruit à graine).

#### Famille I — Mise en page dynamique
31. **Paroles de chanson** (V2 ⭐⭐⭐ 🟢) — 2–3 lignes visibles, la ligne chantée est grande, les autres atténuées, défilement doux.
32. **Étiquettes d'intervenants** (V1 ⭐⭐⭐ 🟢) — une couleur et une pastille par locuteur (diarisation) ; l'étiquette glisse à chaque changement de voix.
33. **Typographie cinétique par importance** (V2 ⭐⭐⭐⭐⭐ 🟡) — la taille des mots dépend de leur importance (IA) et ils s'arrangent dans une grille dynamique, dans la zone de sécurité.

#### Famille J — Sorties et enchaînements
34. **Sortie floue** (V1 ⭐ 🟢) — fondu + flou + légère réduction.
35. **Sortie glissée** (V1 ⭐⭐ 🟢) — la page glisse hors cadre avec accélération.
36. **Continuité** (V1 ⭐⭐⭐ 🟢) — les mots déjà affichés **restent en place** et seuls les nouveaux arrivent ; pas de coupure entre pages.

**Total : 27 candidats « V1 » et 9 « V2 »** (36 au total). On **garde 20 styles pour la V1** après les prototypes et le choix d'Ashanti : les 7 autres candidats passent en V2.

### 4. Ce que font les logiciels de référence (pour que Claude Code reconnaisse le niveau)

| Logiciel | Ce que les pros utilisent pour le texte animé |
|---|---|
| **After Effects** | **Animateurs de texte** (plusieurs par calque) avec **sélecteur de plage** (début, fin, décalage ; unités : caractères, mots, lignes ; forme, *Ease High / Low*), **sélecteur d'expression** (`textIndex`, `textTotal` pour un décalage précis par lettre), **sélecteur ondulant** ; propriétés position / échelle / rotation / opacité / couleur / flou / tracking ; expressions de ressort et de dépassement ; **Trim Paths** (tracés) ; **mattes** (masques de piste) ; *Turbulent Displace*, *Glow*, *CC Light Sweep* ; **flou de mouvement** et angle d'obturateur ; texte sur tracé ; calques 3D et caméra ; export **MOGRT** (modèle réutilisable dans Premiere). Extensions courantes : Motion Bro, Animation Composer (Mister Horse), Trapcode Particular, Saber, Deep Glow… |
| **Premiere Pro** | Piste de **sous-titres** avec styles de piste ; **Essential Graphics** (MOGRT avec paramètres exposés) ; animations d'apparition/disparition ; masques et recadrage animés ; **Dynamic Link** avec After Effects. Plugins de sous-titres animés mot par mot (karaoké, boîtes) courants. |
| **DaVinci Resolve (Fusion)** | **Text+** avec **Follower** (animation par caractère), *Write-On*, *Shake*, styles par caractère, modificateurs, titres Fusion (macros), sous-titres convertibles en Text+. |
| **Final Cut Pro / Apple Motion** | **Comportements de texte** (*Sequence Text*, *Type On*), comportements de paramètres (*Overshoot*, *Wriggle*, *Randomize*, *Ramp*), **réplicateur**, texte 3D, titres avec paramètres publiés. |
| **CapCut** (référence des créateurs de courtes vidéos) | Animations de sous-titres **entrée / sortie / boucle**, styles automatiques, images-clés. Peu profond, mais c'est la **norme que les créateurs connaissent** : on doit la dépasser. |
| **Blender** | Nœuds de géométrie : extrusion, instances par lettre, simulations. Très avancé, rendu long : pas pour le temps réel. |
| **Lottie / Rive** | Animations vectorielles exportées depuis After Effects ; utiles pour **autocollants animés** (flèches, étoiles). Les fichiers « communautaires » ont des licences variables : **à dessiner nous-mêmes**. |
| **Remotion (notre moteur)** | `spring()`, `interpolate()`, `Easing`, composants par mot ; paquets à vérifier dans la doc : mesure de texte, flou de mouvement, bruit à graine, tracés, formes, three.js, Lottie, polices Google, analyse audio. **Licence spéciale** : voir `03-…` §3. |

### 5. Alphabets et langues (point technique décisif)

- Découper avec `Intl.Segmenter` (mots et **grappes de caractères**), jamais caractère par caractère à la main.
- **Arabe, persan, hébreu, hindi, bengali, thaï, birman, khmer…** : les lettres changent de forme selon leurs voisines. **Animer par mot** (ou par grappe), jamais par lettre, sinon les liaisons se cassent. Les styles à effet par lettre (décodage, vague, tranches, tracking) basculent automatiquement « par mot » pour ces écritures.
- **Droite → gauche** : le sens des animations (entrée, karaoké, glissement) s'inverse.
- **Chinois, japonais, coréen** : pas d'espaces ; saut de ligne selon la langue ; animations « par caractère » autorisées.
- **Polices :** une famille par alphabet (voir §8). La graisse et la taille doivent rester lisibles dans toutes les langues (tester avec les 20 principales langues de traduction).
- **Traduction :** la page de sous-titres traduite doit garder le **même style et la même position** (règle PRD) ; la durée des animations s'adapte au nombre de mots, pas à la durée en lettres.

### 6. Sécurité visuelle et lisibilité

- **Flashs :** jamais plus de **3 flashs par seconde** (norme WCAG 2.3.1 sur le risque d'épilepsie photosensible). Concerne : néon qui vacille, séparation RVB, claquement avec flash, glitch. Un test automatique doit compter les changements de luminosité forts par seconde et **refuser** (ou atténuer) un préset qui dépasse.
- **Lisibilité sur n'importe quelle vidéo :** contraste ≥ 4,5:1 entre texte et fond, assuré par contour, ombre ou boîte **automatiques** (option « Garantir la lisibilité »).
- **Zones de sécurité (9:16) :** laisser des marges latérales d'environ 8–12 % et réserver le bas (environ 20–25 %) aux boutons des applications ; valeurs à confirmer avec un guide visuel dans l'éditeur, **réglables**.
- **Longueur :** 2 lignes maximum, 3–6 mots, 42 caractères maximum par ligne ; majuscules en option.
- **Réduction de mouvement :** `prefers-reduced-motion` s'applique à **l'interface**. Pour la vidéo, c'est un choix de l'utilisateur ; proposer un réglage global « animations calmes ».

### 7. Qualité « niveau studio » : critères de réception

Chaque style doit passer cette liste avant d'être accepté :
- [ ] Mouvements à **ressort** ou courbe nommée (aucun linéaire visible), dépassement 5–12 % quand c'est un « pop ».
- [ ] Décalage entre mots/caractères régulier et lisible ; sens cohérent avec la langue (RTL).
- [ ] Flou de mouvement sur les mouvements rapides, **sans** flou parasite sur les mouvements lents.
- [ ] Le texte **ne saute pas** (mise en page figée) quand un mot grossit.
- [ ] L'impact de l'animation tombe sur le **début du mot** (test à l'oreille avec 3 vidéos).
- [ ] **Déterminisme :** deux rendus du même projet donnent des images identiques (comparaison image par image).
- [ ] Rendu fluide (aperçu 30 i/s sur un ordinateur moyen) ; styles 🔴 avec version allégée.
- [ ] Lisible sur fond clair, sombre, chargé (3 vidéos tests).
- [ ] Fonctionne en 9:16, 1:1, 4:5, 16:9 avec la même position (en %).
- [ ] Test de flashs (§6) réussi.
- [ ] Testé en français, anglais, **arabe**, **hindi**, **chinois**, **yoruba/wolof** (accents).

### 8. Licences (rappel spécifique aux animations)

- **Code d'animation : le nôtre.** On s'inspire des *techniques* (ressort, décalage, masque, flou de mouvement, 3D), qui ne sont pas protégées ; on ne copie pas un préset précis ni son nom.
- **Interdit dans le produit :** presets After Effects, MOGRT, LUT, modèles achetés ou « gratuits » téléchargés ailleurs (licences de redistribution interdites), animations Lottie communautaires, polices Adobe Fonts, assets sous licence « attribution obligatoire » (ex. CC-BY).
- **Noms :** pas de style au nom d'une personne réelle (« style Hormozi », etc.) ni d'une marque. Décrire par le look (« Impact jaune »). 
- **Polices :** licence **OFL** uniquement ; à **vérifier à l'installation** (fichier OFL du dépôt) : par exemple Anton, Bebas Neue, Archivo Black, Montserrat, Poppins, Inter, Space Grotesk, Playfair Display, Instrument Serif, Fraunces, JetBrains Mono ; pour les alphabets non latins : famille **Noto** correspondante (Arabic, Devanagari, Thai, CJK…). Noter chaque police dans `docs/THIRD_PARTY.md`.
- **Émojis :** polices d'émojis **sous OFL** (ex. Noto Color Emoji) rendues par nous. Éviter les packs animés « attribution obligatoire ».
- **Remotion :** déjà couvert (`03-…` §3). Les paquets annexes de Remotion relèvent de la même licence spéciale.
- **Outils d'analyse :** les nouvelles dépendances passent par la procédure habituelle (lecture du LICENSE, confirmation d'Ashanti, `THIRD_PARTY.md`).

### 9. Ordre de travail pour Claude Code

1. **Lire** ce document + `visuels/03-animation-basique-vs-pro.png` ; résumer en 10 lignes ce qu'il comprend du niveau attendu.
2. **Proposer l'architecture du moteur de presets** (schéma Zod des presets, calcul de la mise en page, interface « sélecteur / propriété / courbe »), **sans coder les 36 styles**.
3. **Prototypes de validation (5)** dans Remotion Studio, un par famille : *Pop à ressort* (A1), *Remplissage karaoké* (B5), *Fondu avec espacement qui s'ouvre* (C9), *Néon qui vacille* (D13), *Séparation RVB* (E16). Montrer à Ashanti en **vidéo** (pas en capture) et ajuster le ressenti.
4. **Page interne `/dev/animations`** (désactivée en prod) : tous les styles, avec **ralenti, lecture image par image et réglages en direct**. C'est l'outil de l'agent `qa-tester`.
5. Seulement ensuite : les 20 styles V1, puis la **galerie** (aperçus en boucle, muets) et les **réglages** utilisateur.
6. Tests automatiques : déterminisme (comparaison d'images), flashs, lisibilité, alphabets (§5, §7).
7. À chaque étape : dire quel modèle utiliser (Opus : architecture et « feeling » ; Sonnet : production des styles).

**Ce qu'Ashanti doit apporter :** une **vidéo d'écran de 30 à 60 secondes** de la galerie de styles de Caption Studio (chaque style qui joue sur un texte), idéalement aussi des **exemples d'animations qu'il adore** (After Effects, Premiere, CapCut ou autre), avec une phrase par exemple dans `screenshots/NOTES.md`. Une vidéo vaut beaucoup plus que des captures pour des animations.

### 10. Sources lues (techniques générales)

- Animateurs et sélecteur d'expression (After Effects) : https://dev.to/kocreative/after-effects-text-animation-and-the-expression-selector-a2l
- Sélecteurs de plage, forme et facilité : https://www.premiumbeat.com/blog/animate-individual-letters-in-after-effects/ (résumé de la page lue)
- Effets de sous-titres courts (karaoké, mot par mot, zones de sécurité) : https://cutback.video/guide/animated-captions
- Caractéristiques d'un style « viral » (majuscules, 4–6 mots, mot fort en couleur, émojis) : https://www.submagic.co/blog/how-to-make-alex-hormozi-captions
- Caption Studio (page publique) : https://captionstudioo.com

*Les recettes « Comment les pros le font » sont une synthèse de pratiques courantes ; Claude Code doit les **vérifier dans la documentation officielle** de chaque outil avant de s'y fier. Ce document n'est pas un avis juridique.*

---

## Analyse de l'interface Caption Studio (vue de l'intérieur) — et comment SemGen fait mieux

> Observé le 18/10/2026 dans le compte gratuit d'Ashanti (`app.captionstudioo.com`), sans vidéo importée. On a lu l'interface, les réglages et la liste des styles. **On ne copie ni leur code, ni leurs noms de styles, ni leurs valeurs** : on retient les *fonctions* et le *niveau* à dépasser. Tout ce qui n'a pas pu être vu (animations sur une vraie vidéo, rendu à l'export) est signalé.

### 1. Ce que Caption Studio propose

#### 1.1 Écran principal
- Barre du haut : importer une vidéo, Transcrire, solde de crédits, Passer Pro, Exporter, thème clair/sombre.
- Formats de sortie : **Origine, 9:16, 1:1, 16:9** (pas de 4:5, pas de 21:9, pas de recadrage intelligent visible).
- Limite gratuite : **MP4, 50 Mo, 1 minute**.
- Onglets : **Style · Transcription · Réglages · Short YT · Historique · Exportations · Extension Premiere Pro**.
- Une **timeline** avec des « couloirs de mots » (mots déplaçables), un fichier dédié au moteur de rendu des sous-titres.

#### 1.2 Les 13 styles
2 gratuits (un style « cinéma » en police condensée, un style « simple » sur une ligne) et 11 premium. Chaque aperçu est une carte animée sur fond sombre avec un halo coloré. En résumé, les familles sont :
- **Phrase + mot fort** : 2–3 petits mots autour d'**un mot géant** (le « mot fort ») d'une autre couleur, avec lueur. Variantes : rouge en police technique majuscule, bleu glacé, or en police à empattements, blanc très gras avec halo, italique très gras rouge, arrondi doré « rebondissant ».
- **Styles « scène »** (plusieurs lignes construites comme un plan de montage) : alternance sans-serif très gras + **mot en italique à empattements** ; **texte en contour seul** (lettres vides) avec rotation ; **pile logique** (lignes de tailles différentes, un mot rouge) ; **style documentaire** : fond rouge plein écran toutes les 4 pages avec **flash**, **mot géant flou en arrière-plan**, **compteur** (chiffre géant + libellé), texte rouge sur fond blanc.
- Un style caché supplémentaire (punch orange « viral »).
- **« Mes styles »** : enregistrer ses propres réglages comme style.

#### 1.3 Animations d'entrée (10)
Fade-up (défaut) · Mot par mot (pop) · Type flow · Slide · **Motion blur** · 3 animations propres aux styles « scène » · Zoom · Aucune.
**Avance du texte** : le mot apparaît **avant la voix** (réglable de 0 à 400 ms, 120 ms par défaut). *Bonne idée à reprendre.*

#### 1.4 Réglages du texte
- **Polices** séparées pour le texte principal et pour le **mot fort**, graisse séparée, casse séparée (11 polices).
- **Couleurs** principale / mot fort (« Auto » = couleurs du style).
- **Dégradé** de 2 à 4 couleurs avec angle, appliqué au principal et/ou au mot fort, dégradés enregistrables (7 fournis).
- **Contour** (couleur, 1–12 px), conseillé sur fonds clairs.
- **Position** X / Y, **échelle**, **interligne**, **espacement des lettres**.

#### 1.5 Effets
- **Ombre** : opacité, angle, distance, flou, couleur.
- **Glow simple** : intensité.
- **Deep Glow** (lueur avancée) : 3 modes (texte protégé / arrière large / avant léger), rayon, exposition, seuil, douceur, teinte, mode de fusion (écran / ajout / normal), **aberration chromatique**, opacité de la source.
- **Light Sweep** (reflet qui traverse le texte) : animé / statique / désactivé, vitesse, angle, largeur, position, couleur.
- Réglages spécifiques au style documentaire (couleurs des fonds, du mot géant flou…).

#### 1.6 Vidéo et son
- **Transformation vidéo** : position, échelle, rotation, opacité, avec images-clés.
- **Logo animé** en filigrane à l'export.
- **Effets sonores automatiques** : flash au début, **déclic par mot sur les phrases choc**, son de transition, son final calé sur la fin ; volume.
- **Musique de fond** : bibliothèque de 38 titres, volume, **ducking** (baisse sous la voix), fondus d'entrée et de sortie.

#### 1.7 Autres
- **Short YT** (packs payants) : coller une vidéo YouTube → l'IA repère les meilleurs passages (Top 15 / Top 25 / découverte), option « accroche en tête ».
- **Extension Premiere Pro** (Windows, comptes payants, installateur non signé).
- Historique, exportations, kit de marque.

#### 1.8 Non vu
L'animation sur une vraie vidéo, la qualité du rendu final, la vitesse d'export, la précision du timing. → Ashanti peut importer une vidéo d'une minute et faire une **vidéo d'écran**.

### 2. Ce qu'ils font bien (le niveau minimum à atteindre)
1. **Le « mot fort »** traité comme un rôle à part (police, graisse, couleur, taille, effets séparés). C'est le cœur du look « viral premium ».
2. **Effets de finition de niveau After Effects** : lueur avancée avec seuil/exposition, aberration chromatique, reflet lumineux, dégradés multi-couleurs, contour.
3. **Styles « scène »** qui ne sont plus des sous-titres mais de la **typographie de montage** (fond plein écran, mot géant flou, compteur, flash).
4. **Avance du texte** (le texte arrive un peu avant la voix).
5. **Son design automatique** lié au texte (déclic par mot sur les phrases choc).
6. Aperçus de styles animés, réglages sauvegardables.

### 3. Ce qui leur manque ou peut être mieux fait (là où SemGen gagne)

| Sujet | Caption Studio (observé) | SemGen Studio (objectif) |
|---|---|---|
| Nombre de styles | 13 (2 gratuits) | 20 en V1, 36 au catalogue, + styles enregistrés |
| Animations d'entrée | 10, une seule par style | **Entrée + emphase du mot actif + sortie**, combinables ; ressorts réglables (raideur, amortissement, dépassement) |
| Courbes | non exposées | Ressorts et courbes nommées, **aperçu de la courbe** |
| Karaoké / mot actif | non visible comme option | Remplissage karaoké, boîte glissante, surligneur, soulignement dessiné |
| 3D, glitch, décodage, vague, masques | absents | Familles E, F, G du catalogue (`06-…`) |
| Flou de mouvement | une animation « motion blur » | Flou de mouvement **physique** sur toute animation rapide (angle d'obturateur) |
| Formats | Origine, 9:16, 1:1, 16:9 | + **4:5, 4:3, 21:9**, **recadrage intelligent** qui suit le visage |
| Traduction | non vue | **1 clic → 100+ langues**, même style et même position |
| Alphabets | non vu | Arabe/hindi animés **par mot**, droite→gauche, polices par alphabet |
| Montage auto, doublage | non vus | Coupe des silences/« euh »/répétitions, doublage 90+ langues |
| Durée gratuite | 1 min, 50 Mo | à définir (10 crédits) |
| Polices | 11, dont certaines **non libres** pour un usage SaaS | Uniquement **OFL**, couverture de tous les alphabets |
| Sécurité visuelle | flash plein écran possible | **Test anti-clignotement** (≤ 3 flashs/s) |
| Premiere | extension Windows non signée | Export **SRT/VTT** + plus tard export **XML/MOGRT**, application signée |
| Paiement | crédits | Crédits + **Mobile Money** (Afrique) + cartes |

### 4. Règles pour Claude Code
- S'inspirer des **fonctions** ci-dessus (rôle « mot fort », lueur avancée, reflet, avance du texte, son lié au texte, styles « scène »). Ce sont des idées, pas du code.
- **Ne pas reprendre** : leurs noms de styles, leurs valeurs par défaut, leurs textes d'exemple, leurs fonds d'aperçu, leur code (`engine.js` etc.), ni leurs polices non libres. Polices vues chez eux et **interdites chez nous** tant que la licence n'est pas OFL vérifiée : Gobold, Ansage, Coolvetica, Ink Free. (Bebas Neue, Chakra Petch, Archivo Black, Baloo 2, Gloock, Sora, Instrument Serif, Alex Brush, Poppins, Inter, Playfair Display sont annoncées OFL : **vérifier le fichier OFL avant usage**.)
- Ajouter au moteur (en plus de `06-…`) : **rôle « mot fort »** avec ses propres réglages, **Deep Glow** (seuil, exposition, rayon, teinte, mode de fusion, aberration chromatique), **Light Sweep** (animé/statique), **dégradés 2–4 couleurs**, **avance du texte** (0–400 ms), **styles « scène »** (fond plein écran, mot géant flou, compteur), **son design lié au texte** (avec licence des sons vérifiée).

### 5. Mesures image par image sur une vraie vidéo (18/10/2026, 23 h 55)

> Vidéo d'Ashanti (43 s, 177 mots, 26 pages de sous-titres). On a lu, **image par image à 30 i/s**, l'état de chaque mot (opacité, déplacement, échelle, flou) pour les 9 animations d'entrée, sur la même page de sous-titres. Le projet d'Ashanti a été remis à l'identique après les tests. Les valeurs sont exprimées en **em** (taille de la police) pour être indépendantes de la résolution.

| Animation | Ce qui bouge | Amplitude de départ | Opacité 0 → 1 | Mouvement posé après | Courbe |
|---|---|---|---|---|---|
| Fade-up (défaut) | monte + net | Y +0,45 em, flou 0,7 em | 6 images (0,2 s) | ~11 images (0,37 s) | ralenti de sortie (type exponentiel), **sans dépassement** |
| Motion blur | monte + flou fort | Y +0,6 em, flou 1,5 em | ~5,5 images | ~11 images | idem |
| Slide | glisse de la gauche | X −0,85 em | ~6,5 images | ~11 images | idem |
| Type flow | petit glissement rapide | X −0,18 em | 2 images | ~4 images | idem |
| Mot par mot (pop) | grossit | échelle 0,6 → 1 | ~4 images | ~7 images | idem, **pas de rebond** malgré le nom « pop » |
| Zoom | rétrécit | échelle 1,35 → 1 | ~5 images | ~10 images | idem |
| Story Flow | monte + flou | Y +0,5 em, flou 0,8 em | ~4 images | ~8 images | idem |
| Creator Punch | apparition **sèche** | aucune | 0 image (coupe nette) | — | coupure, effet « punch » |
| Viral Flow | page entière d'un coup | — | — | — | animation gérée au niveau de la scène |

**Ce que ça veut dire :**
- Chaque mot démarre **à son propre instant** (horodatage du mot) moins l'**avance** de 120 ms. Le décalage entre mots vient donc de la voix, pas d'un délai fixe.
- **Toutes** les animations sont des ralentis simples : **aucun ressort, aucun dépassement, aucun rebond**, aucun flou de mouvement physique (le « motion blur » est un flou qui diminue, pas un flou directionnel calculé sur la vitesse).
- Les amplitudes sont **petites et discrètes** (moins d'1 em) : c'est élégant et lisible, mais c'est surtout la **finition** (polices, mot fort géant, lueurs, reflet, dégradés) qui donne l'impression « premium », pas le mouvement.
- L'opacité monte en **ligne droite** pendant que le mouvement ralentit : bonne pratique (le mot est lisible vite).

**Objectifs chiffrés pour SemGen (à valider sur prototypes) :**
1. Garder une **famille « discrète »** équivalente (amplitudes < 1 em, opacité en 4–6 images, pose en 8–11 images) : c'est la base des styles sobres.
2. Ajouter ce qu'ils n'ont pas : **ressorts avec dépassement** réglable (5–12 %), **rebond** réel pour le pop, **flou de mouvement directionnel** proportionnel à la vitesse, **animation du mot actif** (emphase pendant qu'il est prononcé), **sorties** animées, décalage par **caractère** en option.
3. Garder l'**avance du texte** (0–400 ms, défaut ~100–120 ms) et l'**opacité linéaire rapide**.
4. Exprimer toutes les amplitudes **en em** (comme ci-dessus) pour que le rendu soit identique dans tous les formats et toutes les tailles.

**Non mesuré :** les sorties de page, l'animation du mot fort pendant la lecture, les styles « scène » (Story Doc : flash, mot géant flou, compteur) et le rendu final exporté. L'extension Premiere Pro n'a pas été testée (réservée aux comptes payants, installation sur Windows non signée : on ne l'installe pas).
