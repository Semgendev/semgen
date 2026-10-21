# Analyse des vidéos de référence v10 à v13

Méthode : planches 4 images/s (0-24 s) + images agrandies + vignettes 24-32 s pour v10 et 24-34 s pour v12. Les noms de polices d'origine sont des hypothèses à l'oeil (« probable » ou « incertain »). Logos et noms de comptes non recopiés.
Déjà couverts chez nous : Cinéma, Élégance, Éditorial, Signature, Minimal, Pop à ressort, Surligneur, Convergence, Impact rouge, Or liquide, Verre, Remplissage.

---

## v10 — Démo « Brut / Editado » d'une agence (dentiste, portugais), maquette dorée
Un cadre « Editado » montre la vidéo montée : plans face caméra avec plusieurs styles de texte, écrans blancs de motion graphics, carte de fin. Le texte est petit (cadre réduit), donc détails moins sûrs.

### v10-A « Serif Italic Pop » (mot clé géant en serif italique + petites lignes sans empattement)
- Position : milieu-bas du buste. Mise en page empilée : petite ligne au-dessus, GRAND mot clé au milieu, petite ligne dessous (ex. « será que é / normal / usar aparelho »).
- Mots : 2 à 5 par page, 2-3 lignes, chaque ligne apparaît mot par mot.
- Mise en forme : minuscules. Petites lignes : sans-serif géométrique gras, interlettrage serré, taille 1x. Mot clé : serif italique à fort contraste (didone), gras, taille 3x à 4x, lettres collées (interlettrage négatif).
- Police petites lignes : type Poppins / Montserrat SemiBold (incertain). Mot clé : proche de Playfair Display Italic Bold ou Instrument Serif Italic. Libres proches : Playfair Display (OFL), Instrument Serif (OFL), DM Serif Display Italic (OFL) ; sans : Poppins, Montserrat, Plus Jakarta Sans (OFL). Origine possiblement commerciale (type Canela / PP Editorial), incertain.
- Couleurs : blanc (#FFFFFF), très léger ombrage sombre. Pas de contour, pas de pastille.
- Entrée : mot par mot, rapide, petit glissement de bas en haut + fondu (150-250 ms). Le mot clé arrive en grossissant un peu, au moment où il est dit.
- Sortie : la page disparaît d'un coup (coupe ou fondu très court).
- Mot actif : le mot dit s'allume (de transparent à blanc plein) ; le mot clé est mis en valeur par la taille, pas par la couleur.
- Effet : un trait fin en ellipse blanche dessiné autour de « no meio do caminho » (soulignement animé). Pas de lueur.
- Difficulté : MOYEN. Mise en page empilée à tailles mixtes + deux familles de polices ; l'animation est simple.
- Qualité pro : le contraste de taille et de style (serif italique contre sans gras), interlettrage serré = look magazine.
- Ressemblance : proche de « Éditorial »/« Élégance ». Nouveau : le mot clé géant est choisi dans la phrase.

### v10-B « Serif Whisper » (petit serif léger)
- Milieu de l'image, une ligne de 1 à 4 mots (« quando todos », « os dentes », « se você falta as consultas »).
- Minuscules, serif de lecture léger, TRÈS petit. Proche de Cormorant Garamond / EB Garamond / Newsreader (OFL).
- Blanc cassé, ombre légère. Entrée fondu doux par groupe, sortie fondu court.
- Difficulté : FACILE. Déjà couvert par « Minimal » / « Cinéma ».

### v10-C « Glass Chip List » (pastilles de verre numérotées)
- Au milieu de la vidéo ; pastilles en grille 2 + 1 : numéro dans un petit losange de verre + texte sans empattement gras blanc sur 2 lignes (« 1 Complexidade do caso », « 2 Colaboração do paciente », « 3 planejamento do profissional »).
- Pastille arrondie en verre dépoli (fond blanc 10-15 %, flou d'arrière-plan, bord lumineux fin). Sans-serif gras type Poppins/Montserrat Bold (OFL), minuscules.
- Entrée : chaque pastille apparaît quand le point est cité, fondu + petite montée + flou qui se précise. Sortie : tout part d'un coup.
- Difficulté : MOYEN (backdrop-filter coûteux en rendu Lambda).
- Qualité pro : le verre propre et l'ordre d'apparition calé sur la voix. Variante de notre « Verre » ; nouveauté = LISTE NUMÉROTÉE (points clés).

### v10-D « Letter Spread Reveal » (sur écran blanc de motion graphics)
- Haut-centre d'un écran blanc au-dessus d'un chronomètre 3D. Petit mot sans-serif léger bleu (« geralmente »), puis « o tratamento » en serif italique gras bleu foncé (~#1F4E8C) avec ombre portée bleutée douce ; « não se estende » en bas, même logique.
- Entrée lettre par lettre : lettres très ÉCARTÉES (interlettrage énorme) qui se resserrent en se recentrant, avec léger flou.
- Difficulté : FACILE à MOYEN (préférer des transformations par lettre plutôt qu'animer letter-spacing, pour éviter les sauts de ligne).
- Qualité pro : le resserrement (tracking in) est un classique After Effects ; NOUVEAU chez nous (C9 « Espacement » est à refaire).

### v10-E Carte de fin : logo sur fond bleu, capitales espacées. Pas du sous-titre.

Résumé v10 : 4 styles de texte (Serif Italic Pop, Letter Spread Reveal nouveaux ; Glass Chip List variante de Verre ; Serif Whisper déjà couvert).

---

## v11 — Montage « collage kinétique » noir et blanc (trame de points), aberration chromatique rouge/cyan, anglais
Plans de collage (portrait en trame, oeil, oreille, cerveau, billets). Pas de sous-titre en bas : le texte fait partie du décor, sur fond papier clair ou noir. Toute l'image a une aberration chromatique rouge/cyan légère et une vignette.

### v11-A « Script + Grotesk Duo »
- Centre-haut, 2 lignes empilées, inclinées avec la scène 3D (« The visual / hits your eye », « before the word / hits your ear », « He forces your brain / to process two signals / at once »).
- Ligne d'ouverture en script cursive fine (taille 1x) ; ligne principale en sans-serif gras (1,3x) ; petit mot final parfois en script gris clair.
- Police script : proche de Great Vibes / Pinyon Script (libres OFL : Great Vibes, Allura, Alex Brush, Pinyon Script). Sans gras : forme du « t » à crochet bas, proche de Lexend / Outfit / Sora (OFL).
- Couleurs : noir (#0A0A0A) sur fond clair, blanc sur fond sombre ; script plus fin/gris. Franges chromatiques cyan/rouge 1-2 px.
- Entrée : mot par mot, glissement ~20 px de bas en haut + flou qui devient net + fondu ; script plus lent, gras plus sec. Rythme 3-4 mots/s.
- Sortie : toute la page part avec la scène (flou de mouvement).
- Mot actif : pas de surlignage ; les mots non dits sont absents ou gris pâle.
- Difficulté : MOYEN. Duo de polices + inclinaison 3D ; l'aberration chromatique = 3 copies décalées (rouge/cyan/texte) en mix-blend-mode.
- Qualité pro : contraste script / grotesque, et texte qui vit dans la scène (même flou, même vignette).
- Ressemblance : proche de « Signature », nouveauté = DUO script + gras par page.

### v11-B « Soft Glow Grotesk » (rack focus)
- Centre, 2 lignes en escalier (« the simple set », « the billion dollar man », « You don't need »).
- Minuscules, sans-serif géométrique arrondi gras moyen (Lexend / Outfit SemiBold, OFL), taille grande (~1/16 de la largeur).
- Blanc/gris clair (#EDEDED), lueur blanche diffuse (0 0 20px ~40 %) sur fond noir.
- Entrée : mots d'abord FLOUS et transparents, grossissent de 0,9x à 1x en se précisant, décalage ~150 ms par mot, parfois en diagonale.
- Sortie : flou fort + fondu de toute la ligne (~250 ms). Mot actif : le dit est net, les suivants flous/gris.
- Difficulté : FACILE (flou CSS + fondu + lueur). Qualité : mise au point progressive type bande-annonce. Peu nouveau (proche Cinéma).

### v11-C « Neon Red Emphasis »
- Centre, sous la ligne blanche : 1 à 3 mots (« information density », « his budget », « It is a pacing tool »), même police que v11-B.
- Rouge vif (#E10600) avec forte lueur (halo 15-30 px, rouge sombre #7A0000 à 60 %).
- Entrée : mot en flou, petit, glisse en place avec léger rebond et se précise ; la ligne blanche reste.
- Mot fort = rouge + lueur. Difficulté : FACILE. Qualité : un seul accent de couleur dans un monde noir/blanc.

### v11-D « Script Lead-in on Black »
- Centre, 2-3 lignes décalées en escalier (« It's not / decoration », « You need his / engineering. »). Première ligne en script lumineux (taille 1,3x), ligne basse en sans-serif gris clair gras.
- Blanc cassé, lueur blanche douce, fond noir. Entrée fondu + petit flou + montée ; mot suivant en gris atténué qui devient blanc.
- Difficulté : MOYEN. Qualité : lueur sur script fin, placement en escalier qui guide l'oeil.

### v11-E « Panel Bold » : « You see the bold text » en 3 lignes, sans-serif très gras (Lexend/Outfit Black, OFL) noir sur papier blanc, taille 2x, interlettrage serré. Pas d'animation propre (mouvement de caméra). FACILE.

### v11-F « Hook Red Bar » : « is not / his hook. » mot clé sur barre rouge (#E10600) qui se dessine de gauche à droite derrière le mot (masque), mot gris flou puis noir net, ombre légère sous la barre. MOYEN. Déjà couvert par « Surligneur »/« Impact rouge ».

### v11-G « $100 million » : « $100 million » rouge vif gras, « hook » plus petit gris-rouge, entrée flou vers net, aberration chromatique. Même famille que v11-C.

---

## v12 — Créatrice de contenu face caméra (anglais), sous-titres sur la poitrine + écrans blancs de motion graphics (10K, scripting…)
Le sous-titre est posé sur la poitrine/micro (centre de l'image, ~55-60 % de la hauteur) : petite ligne fine + ligne d'impact. Parfois l'écran passe en papier blanc avec objets 3D et le même système de texte en grand.

### v12-A « Three-Tier Type » (principal)
- Exemples : « If scripting / is the / one thing », « that holding your / content back, », « then this / video / is for / you ». 2 à 6 mots par page, 2-3 lignes.
- Petite ligne : sans-serif très léger, minuscules, taille 0,5x. Ligne d'impact : sans-serif extra-gras, taille 1,3x à 1,5x, interlettrage TRÈS serré (lettres qui se touchent presque). Mot d'accent : script italique fin (« one thing », « you », « journey. »).
- Police impact : grotesque extra-gras type Gilroy ExtraBold (commerciale, probable) ou Montserrat Black. Libres : Montserrat ExtraBold/Black, Plus Jakarta Sans ExtraBold, Figtree ExtraBold, Outfit (OFL). Petite ligne : Inter Light / Montserrat Light (OFL). Script : Great Vibes, Allura, Pinyon Script (OFL).
- Couleurs : blanc (#FFFFFF), petit texte blanc ~85 %, script blanc grisé ; noir sur fond blanc. Ombre portée noire douce (0 2px 8px ~40 %).
- Accent : petite arche rouge (#D0111B) tracée sous la ligne principale (trait fin courbe, balayage gauche-droite).
- Entrée : mot par mot. Petits mots : fondu. Mot d'impact : arrive gris flou à 1,1x et se pose net en ~200 ms avec léger glissement. Mot script : glissement lent bas-haut + fondu.
- Sortie : la page disparaît d'un coup avec le début de la suivante.
- Mot actif : hiérarchie fixe fin / gras / script selon l'importance du mot (mots forts choisis à l'avance).
- Difficulté : MOYEN. Il faut que SemGen classe les mots (forts / moyens / accent) et gère 3 polices ; l'animation est simple.
- Qualité pro : trois niveaux typographiques = rythme de graphiste ; texte près du visage.
- Ressemblance : proche de « Éditorial » ; nouveauté = 3 rôles + arche rouge.

### v12-B « Red Block Slam »
- Sur fond papier gris très clair (ombres de fenêtre). Mots très gras blancs sur BARRE ROUGE rectangulaire (#D0111B) avec ombre portée dure en bas-droite ; petit texte noir fin au-dessus/dessous (« growing & », « content creators », « Saturday, », « simple way », « $15,000 »). Sur la vidéo aussi : barre rouge derrière un mot fort (« Saturday, », « $15,000 »).
- Entrée : la barre se déploie de gauche (masque), le texte passe de gris à blanc dedans, puis ombre 3D.
- Difficulté : FACILE. Déjà couvert par « Surligneur »/« Impact rouge » ; différence = ombre portée dure.

### v12-C « 3D Extruded Number »
- « 10K » énorme extrudé en 3D rouge sombre (~#8E0F18 faces, #D0111B dessus), balayage de lumière qui passe sur l'extrusion, petite grille de fond, petits textes (« cross », « followers mark, »).
- Entrée : scale + flou, puis reflet. Difficulté : DIFFICILE (extrusion par couches décalées ou three.js, lourd). À garder pour « chiffre clé » seulement.

### v12-D « Icon Callout » : icône 3D (loupe + page) au-dessus de la barre rouge « scripting » + petite ligne dessous. MOYEN (icône = image fournie).

---

## v13 — Créateur face caméra (anglais), sous-titres minimalistes ; coupes sur fond blanc avec le même texte en noir
### v13-A « Clean One-Word Inter »
- Centre de l'image (~58 % de la hauteur, sur la poitrine/micro). 1 mot à la fois, parfois 2 courts (« to get », « the positive », « I don't »). Un mot toutes les 0,25 à 0,5 s, calé sur la voix.
- Minuscules (majuscule de début de phrase et ponctuation conservées), sans-serif neutre, SemiBold/Bold, petit (~1/40 de la hauteur), interlettrage serré.
- Police : type Inter Tight / Helvetica Now / Neue Montreal (incertain ; les deux derniers sont commerciaux). Libres : Inter Tight, Inter, Geist, Instrument Sans, Hanken Grotesk (OFL).
- Blanc (#FFFFFF) avec ombre noire très douce et large (0 2px 10px ~35 %) ; sur fond blanc : noir (#0B0B0B) sans ombre.
- Animation quasi nulle : le mot remplace le précédent (coupe) avec fondu/flou très court (~80 ms). Pas de rebond, pas de mot actif.
- Difficulté : FACILE. La qualité tient à la police, la taille, l'interlettrage et le calage sur la voix.
- Qualité pro : retenue, grand espace autour, interlettrage serré. Déjà proche de « Minimal » (ajouter le mode un-mot-à-la-fois). NOUVEAU : inversion automatique blanc/noir selon la luminosité du fond.

---

## Résumé : styles uniques trouvés
1. Serif Italic Pop — petits mots gras + MOT CLÉ géant en serif italique, empilés (v10)
2. Letter Spread Reveal — lettres très espacées qui se resserrent en se révélant (v10)
3. Glass Chip List — liste numérotée de pastilles de verre apparaissant à la voix (v10 ; variante de Verre)
4. Script + Grotesk Duo — ligne script + ligne sans gras, glissement + flou, aberration chromatique (v11, v12)
5. Soft Glow Grotesk (rack focus) — sans-serif gras lumineux, mots flous qui se précisent (v11)
6. Neon Red Emphasis — mot clé rouge avec halo rouge sur noir (v11)
7. Script Lead-in on Black — script lumineux en escalier sur fond noir (v11)
8. Three-Tier Type (fin / gras / script) + arche rouge — hiérarchie selon l'importance des mots (v12)
9. Red Block Slam — barre rouge qui se déploie + ombre portée dure (v12, v11 ; proche de Surligneur/Impact rouge)
10. 3D Extruded Number — chiffre extrudé avec balayage de lumière (v12 ; difficile)
11. Clean One-Word Inter — un mot à la fois, petit, serré, inversion blanc/noir sur fond clair (v13 ; proche de Minimal)
Déjà couvert : Serif Whisper (v10 ≈ Minimal/Cinéma).
Effet transversal à ajouter en option : aberration chromatique rouge/cyan sur le texte (v11, v12).

## Polices à ajouter (toutes OFL ; vérifier le fichier LICENSE avant installation)
- Playfair Display (Italic Bold) — OFL — https://fonts.google.com/specimen/Playfair+Display
- Instrument Serif (Italic) — OFL — https://fonts.google.com/specimen/Instrument+Serif
- DM Serif Display (Italic) — OFL — https://fonts.google.com/specimen/DM+Serif+Display
- Cormorant Garamond — OFL — https://fonts.google.com/specimen/Cormorant+Garamond
- Great Vibes — OFL — https://fonts.google.com/specimen/Great+Vibes
- Allura — OFL — https://fonts.google.com/specimen/Allura
- Alex Brush — OFL — https://fonts.google.com/specimen/Alex+Brush
- Pinyon Script — OFL — https://fonts.google.com/specimen/Pinyon+Script
- Lexend (300 à 900) — OFL — https://fonts.google.com/specimen/Lexend
- Outfit (300 à 900) — OFL — https://fonts.google.com/specimen/Outfit
- Montserrat (300 à 900) — OFL — https://fonts.google.com/specimen/Montserrat
- Plus Jakarta Sans (ExtraBold) — OFL — https://fonts.google.com/specimen/Plus+Jakarta+Sans
- Poppins — OFL — https://fonts.google.com/specimen/Poppins
- Inter Tight — OFL — https://fonts.google.com/specimen/Inter+Tight
- Geist — OFL — https://fonts.google.com/specimen/Geist
- Hanken Grotesk — OFL — https://fonts.google.com/specimen/Hanken+Grotesk
Polices d'origine probablement commerciales (à ne pas utiliser, incertain) : Gilroy (v12), Neue Montreal / Helvetica Now (v13), serif display type Canela / PP Editorial (v10).
