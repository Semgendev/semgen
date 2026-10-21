# Analyse des vidéos de référence v06 à v09 (sous-titres animés)

Méthode : planches 6x4 (24 premières secondes) + images agrandies avec ffmpeg + planches supplémentaires pour v07 (25 s, 50 s) et v08 (25 s, 40 s, 55 s). Les vidéos v06, v07, v08 sont des « avant / après » de montage (un monteur montre son résultat) ; seul le sous-titre de la partie « Final / Depois » nous intéresse. Les logos et pseudos de comptes ne sont pas recopiés.

Rappel des 12 styles déjà faits : Cinéma, Élégance, Éditorial, Signature, Minimal, Pop à ressort, Surligneur, Convergence, Impact rouge, Or liquide, Verre, Remplissage.

Les valeurs hex sont des approximations lues sur les images (à vérifier à l'oeil pendant la création des presets). Tout ce qui est marqué « incertain » n'a pas pu être confirmé.

---

## Fiche v06 — Femme qui parle (portugais) devant une étagère, en studio

**(1) Ce que montre la vidéo.** Un monteur montre à l'écran son logiciel de montage, puis le résultat : une interview verticale avec des sous-titres « magazine » : de petits mots blancs et UN mot clé géant en italique serif doré. Une affiche de livre apparaît en incrustation (animation de carte, pas un sous-titre).

### Style S1 — « Gold Editorial Mix » (petit sans + mot clé géant serif italique doré)

- **Nom proposé** : `Gold Editorial Mix`.
- **Position** : tiers inférieur, autour de la poitrine/menton. Le bloc est ancré au centre, mais le mot clé est décalé légèrement (centre-gauche) et les petits mots flottent autour (au-dessus à gauche, en dessous à droite). Pour une phrase très haute dans le cadre (ex. « Tinhamos editores »), le bloc est mis EN HAUT de l'image, au-dessus de la tête, pour ne pas cacher le visage.
- **Mots à la fois** : 2 à 5 (une « phrase » de 3 à 5 mots est affichée en tout ; 1 mot clé + 2 à 4 mots secondaires).
- **Mise en forme** : deux niveaux de taille très marqués. Mots secondaires : minuscules, très petits (environ 10 à 14 % de la taille du mot clé), sans-serif régulier/medium, interlettrage serré, parfois sur 2 lignes (« de video mas » étalé en 3 petits mots éloignés les uns des autres). Mot clé : minuscules, très gros (3 à 4 fois la taille des autres), italique, serif display à très fort contraste (pleins épais, déliés très fins).
- **Police (dessin)** : mot clé = italique gras/noir à fort contraste, empattements fins, « r » et « a » à boucles rondes, terminaisons en goutte, un peu étirée. Ressemble à **Playfair Display Black Italic**. Les petits mots = sans-serif géométrique/néo-grotesque très propre, lettres rapprochées (type Inter Tight / Helvetica Now).
  - Polices libres proches (OFL) : `Playfair Display` (italique gras 800/900), `DM Serif Display` (italique), `Gloock` (pas d'italique : l'incliner en CSS serait un faux italique, à éviter), `Bodoni Moda` italique. Pour les petits mots : `Inter Tight`, `Manrope`, `Hanken Grotesk`.
  - Police d'origine : probablement une police serif commerciale type « PP Editorial New Ultrabold Italic » ou « Recoleta/Canela Black Italic » (incertain). Les petits mots : « Helvetica Now / Neue Montreal » (incertain).
- **Couleurs** : petits mots = blanc `#FFFFFF` (parfois blanc cassé `#F5F5F0`), sans contour, légère ombre douce (flou ~6 px, noir 35 %). Mot clé = dégradé vertical or-orange : haut jaune `#FFC93C`, bas orange `#F58A07`, avec brillance (reflet clair vers le haut de la lettre) et **halo/lueur** orangé autour (flou large ~20 px, `#FF9A1F` 50 %). Variante vue sur d'autres mots clés de la même vidéo : **crème doré lumineux** (`#F6E7B8` avec lueur chaude `#FFD98A`, sur « editores » en haut), et **blanc pur** avec ombre portée (sur « roteiro »). Donc la couleur du mot clé change selon le mot.
- **Animation d'entrée** : les petits mots apparaissent mot par mot en fondu rapide + léger flou (~0,15 s), sans mouvement marqué. Le mot clé arrive avec un fondu + flou qui se précise (blur-in de ~0,2 s) et un petit rebond d'échelle (110 % puis 100 %). Il semble se superposer au mot précédent (plusieurs mots clés peuvent se chevaucher une fraction de seconde : c'est un fondu enchaîné, pas un saut).
- **Sortie / transition** : tout le bloc disparaît en fondu court ; le nouveau bloc arrive à une position légèrement différente (la mise en page change à chaque phrase : le mot clé n'est pas toujours au même endroit). Les derniers mots d'une phrase s'ajoutent en bas pendant que le mot clé reste affiché (le mot clé reste ~1 à 1,5 s).
- **Mot actif** : pas de surlignage mot par mot ; l'accent = le mot clé géant (choisi par le sens de la phrase : « editores », « contrata », « entregar », « conteúdo », « roteiro »).
- **Effets spéciaux** : lueur chaude autour du mot clé doré ; **ellipse dessinée à la main** (trait orange fin, légèrement ouverte) tracée autour du mot « conteúdo » (soulignement animé en forme d'anneau, vu une fois) ; léger flou de mouvement à l'apparition. Pas d'emoji.
- **Durée / rythme** : un bloc dure 1,3 à 2,5 s ; 1 mot clé toutes les 2 à 3 s.
- **Difficulté Remotion/CSS** : **moyen**. Facile : deux tailles + dégradé de texte (`background-clip: text`) + `text-shadow`/`filter: drop-shadow` pour la lueur. Moyen : placement libre des petits mots autour du mot clé (il faut un moteur de « mise en page de phrase » qui choisit l'ordre et les décalages) et l'ellipse dessinée (SVG `stroke-dashoffset`). Difficile seulement si on veut reproduire le choix automatique du mot clé (à faire avec une règle simple : mot le plus long / mot marqué par l'utilisateur).
- **Qualité pro** : le **contraste d'échelle** (1 mot de 4x la taille) + le mélange sans/serif italique + le dégradé doré avec halo donnent l'effet « affiche de magazine ». Le bloc est déplacé pour ne jamais couvrir le visage. Le mot clé change de couleur selon le mot (or, crème, blanc) au lieu d'un seul accent répété.

### Style S2 — « Quiet Two-Line » (sous-titre simple de repos)

- **Position** : bas du tiers central (sous le menton). **Mots** : 4 à 6 sur 2 lignes. **Mise en forme** : minuscules, sans-serif medium/semi-gras, blanc, très serré (interlettrage négatif), centré, taille petite (~3 % de la hauteur). Ex. « mas a pessoa / precisa pensa o vídeo. ».
- **Police** : même petite sans que S1 (Inter Tight / Hanken Grotesk). **Couleur** : blanc, ombre légère.
- **Entrée** : fondu + léger flou. **Sortie** : fondu. Pas de mot actif. Utilisé quand la phrase n'a pas de mot à mettre en avant.
- **Difficulté** : facile. **Qualité** : l'interlettrage serré et la petite taille font « pro » ; sert de repos entre les mots clés.

---

## Fiche v07 — Homme qui explique un conflit médiatique (portugais), fond rouge-rose

**(1) Ce que montre la vidéo.** Avant/après de montage : un homme qui parle sur fond rose-rouge, avec des sous-titres de type « livre/journal » (serif blanc), des cartes blanches éditoriales qui apparaissent quand il parle d'un sujet, et un panneau « Avant ». Longue (61 s) : le style de sous-titre reste le MÊME de bout en bout (vérifié à 25 s et 50 s) ; seuls les habillages de cartes changent.

### Style S3 — « Book Serif Whisper » (sous-titre serif blanc minimal, taille mini)

- **Nom proposé** : `Book Serif Whisper`.
- **Position** : milieu-bas du cadre (vers la poitrine, ~58 % de la hauteur de la vidéo), centré. Sur les plans à carte blanche, il passe SOUS l'image dans la carte.
- **Mots à la fois** : 1 à 3 (« Recentemente, » / « o que aconteceu » / « trato de paz »). Parfois une 2e ligne plus petite sous la 1re (« acontece / com todos nós » : mot 1 plus grand, suite plus petite et plus basse ; « Foi rápido, / impulsivo, mas viral? » idem, première partie 2,5x plus grande que la deuxième).
- **Mise en forme** : minuscules (majuscule seulement en début de phrase), serif de livre à empattements fins et ouverts, poids régulier, taille petite (~2,5 % de la hauteur) ; la 1re ligne d'une phrase peut monter à ~5 %. Interlettrage normal à légèrement serré. Pas de contour, pas de fond.
- **Police (dessin)** : serif de texte « garalde » : empattements modérés, « a » à double étage, « g » à deux étages (oreille ronde), contraste modéré, « R » classique. Rappelle **Newsreader** / **Source Serif** / **EB Garamond**. Police d'origine possiblement « Tiempos Text » / « GT Sectra » (commerciale, incertain).
  - Libres (OFL) : `Newsreader`, `Source Serif 4`, `EB Garamond`, `Cormorant Garamond` (medium).
- **Couleurs** : blanc pur `#FFFFFF`, ombre portée très douce sombre (flou ~8 px, noir 25-35 %). Aucun mot en couleur.
- **Animation d'entrée** : par bloc de 1-3 mots : apparition douce + flou léger qui se précise (~0,2 s). Dans « acontecer » on voit une frappe **lettre par lettre** (« acont » → « acontece »), soit effet machine à écrire discret, sans curseur, vitesse ~25 lettres/s.
- **Sortie / transition** : fondu rapide ; le texte suivant remplace le précédent au même endroit (pas de glissement). Aux changements de plan (coupes), l'image entière passe par un flou gaussien fort pendant ~0,3 s (transition de plan, pas de texte).
- **Mot actif** : aucun. La hiérarchie vient de la taille (1re ligne plus grande).
- **Effets spéciaux** : aucun.
- **Durée / rythme** : 0,6 à 1,2 s par bloc, rythme très rapide (un bloc par groupe de 1 à 3 mots).
- **Difficulté** : **facile**. Texte statique + fondu/flou + (option) frappe lettre par lettre. **Qualité pro** : la discrétion (petit, serif de livre, blanc) laisse la place au visage ; l'interlettrage et la police de qualité font tout le style. Un bon ajout pour le côté « documentaire / éditorial calme », et utile quand on ne veut pas de décor.

### Style S4 — « Newsprint Card » (texte intégré dans une carte blanche éditoriale)

Ce sont des cartes d'actualité animées (type « article ») plutôt que des sous-titres, mais ils contiennent des animations de texte reproductibles.

- **Position** : à l'intérieur d'une carte blanche arrondie (le panneau « Final » devient blanc), contenu centré en haut de la carte.
- **Composants textuels** :
  1. Titre rouge gras `quem esta certo?` : sans-serif **très gras, interlettrage très serré**, minuscules, rouge sombre `#B3141F`. Police proche de **Inter Tight ExtraBold / Archivo ExtraBold / Familjen Grotesk**. Apparition par **flou qui se précise** (blur-in) sur ~0,3 s, la carte d'abord blanche.
  2. Sur-titre `Nicolas & Whinderson` : **serif italique** (aspect Playfair/Garamond italique), gris très foncé `#2B2B2B`, taille moyenne, écrit **lettre par lettre** (machine à écrire : « Ni » → « Nico/ » → « Nicolas & Wh » → « Nicolas & Whinderson »), mais SANS curseur.
  3. Pastille `brigaram` : mot dans une **boîte noire/gris anthracite** (`#2C2C2C`) aux angles légèrement arrondis, texte blanc sans-serif gras (Inter Tight Bold/Helvetica) avec **curseur-bloc** qui clignote au début (un trait vertical blanc puis une boîte qui s'élargit lettre par lettre : « | », « ▮ », « bri », « brigara », « brigaram »). Le fond noir grandit avec le texte (largeur = texte) = effet « surligneur noir qui s'écrit ».
  4. Petit paragraphe `A confusão começou em…` : sans-serif régulier, minuscule, gris foncé, deux lignes, apparition en fondu.
  5. Plus tard : titre `Fizeram as pazes` en sans gras tassé gris foncé `#333`, texte en dessous « Eles conversaram / e no final, / uma foto juntos » en **serif régulier minuscule** sous l'image (même style S3 mais noir sur blanc).
- **Animation de sortie** : la carte tout entière change (remplacement par une autre carte avec flou) ; effet de « glitch gris » sur l'image (négatif/gris) à un moment (hors texte).
- **Difficulté** : **moyen**. Le texte est facile ; le « surligneur noir qui grandit en suivant la frappe » demande de mesurer la largeur du texte frame par frame (Remotion : `measureText` ou un `ch` avec police à chasse variable, ou animer une largeur calculée). Le reste = cartes à composer.
- **Qualité pro** : le contraste de familles (sans très gras tassé / serif italique / boîte noire à curseur) et la discipline de la grille ; la boîte noire qui « s'écrit » est une très belle idée de mot fort.

---

## Fiche v08 — Avocate (portugais) qui explique le droit à la retraite, cadre violet + étagère orange

**(1) Ce que montre la vidéo.** Avant/après : une jeune femme parle face caméra (INSS / retraite). Le sous-titre « Depois » est un système **riche et très éditorial** qui combine : sans-serif minuscule blanc, mots clés en serif italique doré à halo, acronymes lettre par lettre, chiffres géants, cercles/ellipses dessinés, auras sur l'image, et des cartes d'interface (liste à cocher, curseur) en bas. Vue sur 70 s : le système est cohérent du début à la fin (vérifié à 25 s, 40 s, 55 s) et se répète.

### Style S5 — « Gold Editorial Mix » (le même système que v06, version plus riche)

Même principe que S1 (déjà décrit) : texte blanc petit + 1 mot clé fort. **Nouveautés par rapport à v06** :

- **Variantes de mot clé** :
  - **MOT EN MAJUSCULES GRAS (sans)** : « CONTRIBUIU » : **grotesque extra-gras, majuscules, interlettrage très serré**, dégradé or (haut `#FFE9A8`, bas `#D49A2E`), contour fin doré, halo chaud. Police proche d'**Archivo Black / Inter Tight Black / Anton** (libres). Origine probable : « Neue Haas / Helvetica Now Black » (incertain).
  - **Italique serif blanc** : « aposentar? » : **très grand, serif italique à fort contraste**, le « a » à grande boucle ronde, blanc pur `#FFFFFF` avec lueur blanche douce (flou 12 px). Ressemble à **Playfair Display Italic** (ou **Bodoni Moda Italic**). Le **petit texte `pode se`** est posé au-dessus, en sans minuscule.
  - **Italique serif doré** : « outra opção », « descobrem. », « benefício », « vitalício ». Dégradé or métallique (`#FFE7A0` haut → `#C98A1B` bas), lueur dorée.
  - **Italique gras sur fond rouge** : « é que não. » : serif italique doré, dessin **d'une ellipse rouge** (trait `#E02B2B` ~3 px, légèrement irrégulier) qui s'**entoure autour du dernier mot « não »** (tracé animé en 0,4 s, effet « marqueur »). Anneau ouvert avec chevauchement du trait.
  - **Chiffre géant** : « 1 » : chiffre blanc **sans-serif gras très grand** (~6x les petits mots), positionné à côté du texte, avec petit `Mas existe` (sans minuscule) à côté et `outra opção` (serif doré) dessous : mise en page d'infographie.
  - **Acronyme lettre par lettre** : « B / P / C » : trois **cases dorées** (contour fin `#E0A526`, fond transparent) apparaissent l'une sous l'autre, chaque lettre est une capitale grasse dorée dans la case ; puis les mots (Benefício / Prestação / Continuada) apparaissent à droite, en **blanc sans-serif medium**, la 1re lettre de chaque mot étant la lettre déjà encadrée (les lettres se « verrouillent » dans les cases). Apparition de la liste de haut en bas, 0,3 s par ligne.
  - **Mot clé en sans italique doré métal** : « BPC » (affiché « PPC » en italique gras) : **sans-serif extra-gras italique** doré brillant avec lueur (aspect or poli, reflets blanc). Police proche de **Archivo Black Italic / Poppins ExtraBold Italic** (incliné) — incertain.
  - **« vitalício » avec étincelle** : mot clé serif italique doré avec **étoile/lens-flare** (petite étincelle à 4 branches qui balaye le mot : brillance « sparkle » + traînée) ; effet « light sweep » (reflet qui traverse le mot, en 0,5 s).
  - **« relatando / situações »** : « relatando » en **sans extra-gras blanc**, « situações » en **serif italique blanc** plus petit, collé dessous (mélange sans gras + serif italique). Position au milieu du buste sur plan noir et blanc.
- **Autre effet autour du texte (pas du texte)** : **halo doré (aura circulaire)** autour de la tête de la personne sur le plan en noir et blanc, qui pulse ; image passée en noir et blanc pour faire ressortir le doré (effet de « vignette » cinéma). Le sous-titre blanc + halo doré = charte couleur du style.
- **Position** : tiers inférieur par défaut ; **bascule en haut** quand la phrase est longue ou le visage trop bas (ex. « aposentar? » au-dessus de la tête) ; toujours à l'intérieur d'une zone sûre.
- **Entrée** : mot par mot, **fondu + flou qui se précise + léger zoom arrière (125 % → 100 %)** ; le mot clé a un petit rebond. Les mots secondaires peuvent arriver **un peu après** le mot clé (arrivée en cascade, ~0,1 s). Le blanc petit « fondu » est plus discret.
- **Sortie** : fondu + flou rapide (0,15 s) ; transitions de plan avec flou gaussien de l'image entière.
- **Mot actif** : le mot clé (plus grand, doré). Aucun karaoké.
- **Texte secondaire de repos** (quand pas de mot clé) : `Quiet Two-Line` identique à S2 : sans blanc minuscule, 1-3 mots, centré, tiers inférieur.
- **Difficulté** : **difficile à complet** (nombreuses variantes), **moyen par variante**. Pourquoi : (a) un « moteur de mise en page de phrase » qui compose petit texte + mot clé + chiffres ; (b) dégradés + halos + `light sweep` + étincelle = effets avancés (CSS `mask` animé + SVG) ; (c) tracé d'ellipse SVG (`stroke-dashoffset`) ; (d) acronymes lettre par lettre à synchroniser avec les mots ; (e) aura circulaire sur le visage = nécessite de connaître la position du visage (détection MediaPipe déjà prévue) et de la dessiner en overlay.
- **Qualité pro** : une **charte restreinte** (blanc + or + une seule couleur d'alerte rouge), trois familles seulement (sans extra-gras, serif italique, sans régulier), et un **vocabulaire graphique cohérent** (ellipse, cases, chiffre) au lieu d'une simple animation de texte. C'est ce qui fait « motion designer » et non « filtre CapCut ».

### Style S6 — « Info Overlay Cards » (cartes d'interface sous le sous-titre)

À ne pas confondre avec un sous-titre : petites cartes blanches arrondies (liste à cocher ✔/✘ verte/rouge, curseur à 4 étapes, texte juridique avec surlignage jaune) qui apparaissent sous le sous-titre, avec un petit curseur-main animé. Sous-titre blanc simple au-dessus. **Difficulté** : moyen (composants React + animation de curseur). Peut devenir un module « Callouts » plus tard (hors périmètre sous-titres).

---

## Fiche v09 — Usine de chaussures (anglais), film de marque avec logo final

**(1) Ce que montre la vidéo.** Des plans d'ouvriers dans une usine de chaussures, sans voix visible. Un seul texte animé de 3 s au début (le titre « meet the people behind the shoes »), puis le logo de la marque en fin de vidéo (non analysé : c'est un logo de tiers).

### Style S7 — « Poster Lockup » (titre en 3 familles superposées)

- **Nom proposé** : `Poster Lockup`.
- **Position** : milieu du cadre, centre-gauche, sur 4 lignes qui se **chevauchent** en bloc compact (les lignes se recouvrent légèrement). Texte aligné au centre mais les mots secondaires sont décalés (« behind » à gauche, « the » à droite).
- **Mots** : 6 mots en 4 lignes : `meet the` / `people` / `behind the` / `shoes`.
- **Mise en forme** :
  - `meet the` et `behind the` : minuscules, **serif italique fin**, petits (~8 % de la taille de « people »), blanc légèrement transparent (~85 %).
  - `people` : **minuscules, serif italique à très fort contraste (type Didone)**, très grand (~15 % de la largeur), blanc pur. Traits de liaison fins, « p » et « l » à longues hampes ; ressemble à **Playfair Display Italic** ou **Bodoni Moda Italic**.
  - `shoes` : **sans-serif extra-gras** (type **Inter ExtraBold / Montserrat ExtraBold / Archivo Black**), minuscules, grand (~12 % de la largeur), blanc pur, interlettrage serré, chevauchant le bas de « people ».
- **Couleurs** : blanc `#FFFFFF`, ombre douce noire (35 %, flou 6-10 px) pour décoller du fond clair. Pas de dégradé, pas de contour.
- **Entrée** : lignes en cascade (0,15 s entre chaque), chacune par **fondu + flou qui se précise + glissement de 10-15 px vers le haut** ; « people » arrive avec un très léger zoom arrière. Le blur est visible sur la 1re image (1,95 s).
- **Sortie** : le bloc entier disparaît en fondu en même temps (~0,3 s) ; la durée à l'écran est d'environ 1,8 à 2 s.
- **Mot actif** : aucun (c'est un titre). L'accent est « people ».
- **Effets spéciaux** : aucun (sobre).
- **Difficulté** : **facile à moyen**. Mise en page absolue + `filter: blur` + `translateY`. Le moyen vient du chevauchement précis des lignes (placement manuel à régler) et du choix de 3 familles.
- **Qualité pro** : **le mélange italique serif fin + sans extra-gras** dans un même bloc, avec les lignes qui se chevauchent comme une affiche, donne un effet « magazine de mode » en 3 s sans aucun effet gadget. Transférable aux sous-titres : un mot du sous-titre peut être affiché dans une autre famille.

---

## Résumé : styles uniques trouvés

Pour la comparaison avec les 12 styles existants : S1 et S5 sont dans la famille « Or liquide / Éditorial » mais le **mélange petit sans + mot clé géant serif italique, avec mise en page libre**, n'existe pas dans les 12 styles : c'est nouveau.

1. **Gold Editorial Mix** (S1 + S5) : petits mots blancs sans + mot clé géant en italique serif doré à halo, mot clé qui change de couleur (or / crème / blanc) ; v06, v08.
2. **Quiet Two-Line** (S2) : sous-titre de repos, sans blanc minuscule serré, 2 lignes ; v06, v08 (partie repos). Proche de « Minimal » (déjà couvert), simplement un mode « repos ».
3. **Book Serif Whisper** (S3) : sous-titre serif de livre blanc, petit, 1-3 mots, frappe lettre par lettre discrète, première ligne plus grande ; v07. **Nouveau** (proche de « Élégance » par l'esprit mais plus petit/calme).
4. **Newsprint Card** (S4) : texte dans carte blanche éditoriale, titre rouge gras serré + serif italique tapé + **boîte noire qui s'écrit avec curseur-bloc** ; v07. **Nouveau** (le surligneur noir à curseur).
5. **Hand-drawn Ellipse Mark** (effet de S1/S5) : ellipse rouge/orange tracée à la main autour du dernier mot ; v06, v08. **Nouveau** (« Surligneur » existe, mais pas l'ellipse tracée).
6. **Acronym Boxes B-P-C** (S5) : lettres encadrées en or qui se verrouillent, puis mots ; v08. **Nouveau**.
7. **Giant Number Lockup** (S5) : chiffre géant blanc + petit texte + mot doré ; v08. **Nouveau**.
8. **Light-Sweep Sparkle Word** (S5, « vitalício ») : mot doré avec étoile/reflet qui traverse ; v08. Proche de « Or liquide » (déjà couvert) avec l'étincelle en plus.
9. **Gold Aura on Subject** (S5, halo doré sur la tête) : cercle de lumière sur le sujet, plan en noir et blanc ; v08. **Nouveau** (effet d'image, pas de texte) ; demande la détection du visage.
10. **Poster Lockup** (S7) : titre 3 familles (italique serif fin / italique Didone géant / sans extra-gras), lignes qui se chevauchent, entrée en cascade avec flou ; v09. **Nouveau**.
11. **Info Overlay Cards** (S6) : cartes de liste à cocher / curseur sous le sous-titre ; v08. Hors périmètre sous-titres (module « Callouts » futur).

**Nombre de styles uniques réellement nouveaux : 8** (Gold Editorial Mix, Book Serif Whisper, Newsprint Card, Hand-drawn Ellipse Mark, Acronym Boxes, Giant Number Lockup, Gold Aura on Subject, Poster Lockup) ; + 3 variantes proches de styles déjà faits (Quiet Two-Line ~ Minimal, Light-Sweep Sparkle ~ Or liquide, Info Overlay Cards = hors sous-titres).

## Polices à ajouter

| Police | Rôle | Licence | Lien |
|---|---|---|---|
| Playfair Display (italiques 700/800/900) | Mot clé italique serif fort contraste (S1, S5, S7 « people ») | OFL | https://fonts.google.com/specimen/Playfair+Display |
| Bodoni Moda (italique) | Alternative Didone fine pour « people » / « aposentar? » | OFL | https://fonts.google.com/specimen/Bodoni+Moda |
| DM Serif Display (italique) | Mot clé serif italique doré plus doux | OFL | https://fonts.google.com/specimen/DM+Serif+Display |
| Instrument Serif (italique) | Serif italique éditorial très contrasté, plus légère | OFL | https://fonts.google.com/specimen/Instrument+Serif |
| Newsreader | Serif de livre pour `Book Serif Whisper` (S3) | OFL | https://fonts.google.com/specimen/Newsreader |
| Source Serif 4 | Alternative de S3 | OFL | https://fonts.google.com/specimen/Source+Serif+4 |
| EB Garamond | Alternative de S3, plus classique | OFL | https://fonts.google.com/specimen/EB+Garamond |
| Inter Tight (400-900) | Petits mots sans serrés (S2, S5), titre rouge gras (S4), `shoes` (S7) | OFL | https://fonts.google.com/specimen/Inter+Tight |
| Archivo (800/900, ou Archivo Black) | « CONTRIBUIU » majuscules extra-gras, « BPC » italique gras | OFL | https://fonts.google.com/specimen/Archivo |
| Hanken Grotesk | Petits mots sans, alternative | OFL | https://fonts.google.com/specimen/Hanken+Grotesk |
| Manrope | Alternative pour petits mots | OFL | https://fonts.google.com/specimen/Manrope |
| Familjen Grotesk (option) | Titre rouge serré (S4) | OFL | https://fonts.google.com/specimen/Familjen+Grotesk |

Polices d'origine probables, **commerciales, à ne pas utiliser** : PP Editorial New, Canela, Recoleta, Tiempos, GT Sectra, Helvetica Now, Neue Montreal (toutes incertaines).

Remarque : vérifier dans les polices que la version **italique** existe bien dans le fichier Google Fonts avant d'écrire le preset (ne jamais incliner une police sans italique : faux italique).
