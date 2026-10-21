# Analyse des vidéos de référence v01 à v05

Méthode : planches de 4 images/s (24 premières secondes) + quelques agrandissements ffmpeg. Les polices sont reconnues à l'oeil : tout nom de police est une proposition (« probable » / « incertain »).
Styles déjà faits chez nous : Cinéma, Élégance, Éditorial, Signature, Minimal, Pop à ressort, Surligneur, Convergence, Impact rouge, Or liquide, Verre, Remplissage.

---

## v01 : AslKilba (5 s) : texte « kinétique » sur fond clair, liasses de dollars et lanterne

**(1) Sujet** : mini-promo en motion design 3D (billets, lanterne) ; ce ne sont pas des sous-titres de parole mais des titres cinétiques posés sur le décor. Le style vient du monde « motion graphics After Effects ».

### Style A : « Quiet Stack » (pile de mots à hiérarchie de poids)
- **Position** : centre de l'écran, légèrement au-dessus du milieu, aligné à gauche dans un bloc (3 lignes empilées).
- **Mots à la fois** : jusqu'à 3-4 mots, ils s'accumulent (« You're Making / 1 MILLION / dollar »), puis la page entière est remplacée par une nouvelle (« True Value Always / SHINE »).
- **Mise en forme** : mélange de MINUSCULES-majuscules normales en petit (ligne 1, medium) et MAJUSCULES grasses en gros (mot fort « 1 MILLION », « SHINE », environ 2,2 x plus grand). Dernier mot (« dollar ») en petit, léger, aligné à droite sous le gros mot. Contraste de taille et de graisse = la hiérarchie.
- **Police** : sans-serif géométrique/néo-grotesque très propre, proche d'**Inter** (le « 1 » à drapeau, le « g » simple). Libres proches : **Inter**, **Manrope**, **DM Sans** (OFL). Police d'origine probablement Inter ou Helvetica Now : gratuite (Inter) ; incertain.
- **Couleurs** : gris anthracite sur fond blanc cassé : texte ~ #4A4A4A, mots légers ~ #6B6B6B, fond ~ #E8EAE4 (vert-gris très clair). Petite ombre douce sous le gros mot. Pas de contour, pas de pastille.
- **Entrée** : mot par mot, chaque mot apparaît en fondu depuis environ 40 % d'opacité avec un flou léger qui se précise, léger glissement vers le haut ; le gros mot arrive 1 s environ après le petit (rythme 0,25 s par mot). Le mot fort apparaît « grisé » puis passe en gris foncé plein.
- **Sortie** : la page reste puis est remplacée en bloc au changement de scène (coupe avec le décor, pas d'animation de sortie visible).
- **Mot actif** : par la taille et la graisse seulement (pas de couleur).
- **Effets** : aucun (ombre douce seulement). Le décor 3D (billets, branches) bouge autour.
- **Difficulté** : **facile** (flou + translateY + opacité en cascade, deux tailles de police). Le plus dur est la mise en page automatique d'une phrase en hiérarchie (le mot « fort » doit être choisi).
- **Qualité** : l'espace négatif, le gris sur gris doux, et le fort contraste d'échelle donnent un look « éditorial produit Apple ». Déjà proche de notre **Minimal** + **Éditorial** pour l'esprit ; la nouveauté est la pile à hiérarchie de tailles auto-construite.

---

## v02 : motion_pet (17 s) : avant/après d'un montage sous-titré (interview d'un architecte)

**(1) Sujet** : démo « Before/After » d'un éditeur vidéo : interview face caméra, avec b-roll IA et sous-titres typographiques. Le style vient d'un monteur motion design (Instagram) ; la vidéo contient PLUSIEURS styles dans une même timeline, ce qui est la vraie leçon : le style change selon le mot.

### Style B : « Yellow Glow Pop » (petit mot blanc + mot fort jaune brillant)
- **Position** : centre-bas du cadre (poitrine du locuteur), 2 lignes.
- **Mots** : 2 à 3 à la fois (« my / name's / Paul », « I'm the / Director », « and / Founder »).
- **Mise en forme** : petits mots en minuscules fines (taille ~ 1/3 du mot fort), le mot fort en **gras très lourd**, minuscules avec majuscule initiale (« Paul », « Director »), serré. Disposition en escalier : petit mot en haut à gauche, 2e petit mot décalé à droite, gros mot en dessous.
- **Police** : grotesque très ressemblante à **Helvetica Neue Bold/Heavy** ou **Neue Haas Grotesk** (le « a » à double étage, le « r » court) ; petits mots en Helvetica Light/Regular. Libres proches : **Inter** (800-900), **Archivo** (700-800), **Hanken Grotesk** (OFL). Police d'origine probablement commerciale (Helvetica Neue) : ne pas l'utiliser.
- **Couleurs** : petits mots blanc pur ; mot fort **jaune vif ~ #FFE100** ; **lueur jaune** (halo ~ #FFD60A à 50 %, rayon large) derrière le mot ; pas de contour, léger voile sombre derrière pour la lisibilité.
- **Entrée** : le mot fort « claque » : échelle de ~130 % vers 100 %, avec **flash lumineux** (la lueur est plus forte pendant 3-4 images puis se calme). Les petits mots apparaissent en fondu en 0,15 s. Sur « Director » on voit des **rayons de lumière** qui s'ouvrent en éventail vers le haut derrière le mot (effet « projecteur », triangle jaune translucide).
- **Sortie** : fondu rapide (0,1-0,15 s) en bloc au changement de phrase, aucun glissement.
- **Mot actif** : le mot fort est jaune + lueur, les autres sont blancs.
- **Effets** : lueur, éventail de rayons, léger tremblement d'échelle.
- **Difficulté** : **moyen** (text-shadow multicouche + rayons en `conic-gradient` masqué + ressort d'échelle). Respecter la règle anti-clignotement.
- **Qualité** : la lueur « bulbe » jaune est cohérente avec la lampe de la scène : couleur du texte tirée de la photo. C'est ce qui rend le résultat pro. Proche de notre **Impact rouge / Or liquide** par l'esprit mais avec lueur + rayons : nouveau.

### Style C : « Didone Flourish » (mot fort en italique à empattements fins)
- **Position** : centre-bas, le mot en italique chevauche la ligne du dessus (« Peak » sans-serif gras jaune + « Architects » en italique blanc sous lui ; « central London » + « practice » en italique blanc).
- **Mots** : 2 à 3.
- **Mise en forme** : italique à très fort contraste (jambages ultra-fins, déliés), minuscules, très grand par rapport aux petits mots (≈ 1,4 x), approche de l'écriture manuscrite chic.
- **Police** : italique **Didone / transitionnelle** de magazine, proche de **Playfair Display Italic**, **Bodoni Moda Italic**, **Cormorant Garamond Italic** (OFL). Police d'origine probable : « Pp Editorial New Italic » ou « Bodoni Italic » : payante pour la première ; incertain.
- **Couleurs** : blanc pur, sans ombre marquée, léger voile sombre derrière.
- **Entrée** : le mot est **tracé / révélé de gauche à droite** par masque (les déliés « s'écrivent »), accompagné d'un léger zoom 105 % -> 100 % ; durée ~0,4 s.
- **Sortie** : fondu rapide en bloc.
- **Mot actif** : par changement de police (italique serif vs grotesque gras) plutôt que par couleur.
- **Difficulté** : **moyen** (masque `clip-path` animé + 2 polices ; le tracé « manuscrit » réel serait difficile, mais le balayage de masque suffit).
- **Qualité** : l'accouplement sans-serif lourd / serif italique fin est LE signe « magazine ». **Déjà couvert par Éditorial** (mélange de polices), la nouveauté ici est le balayage de masque et le chevauchement des lignes.

### Style D : « Echo Column » (mot répété en colonne)
- Le mot fort « Peak » est répété en **colonne verticale jaune** (~10 copies empilées, de plus en plus transparentes) derrière le mot blanc central, comme une traînée qui monte et descend.
- Mise en forme : gras, minuscule, jaune ~ #FFD60A pour les échos, blanc pour le mot principal. Entrée : la colonne défile vers le haut en ~0,3 s (échos décalés avec flou de mouvement) puis se résorbe vers le mot central.
- **Difficulté** : **facile à moyen** (N copies avec décalage Y et opacité décroissante). **Nouveau** : « écho / traînée » n'existe pas chez nous.
- **Qualité** : très « motion designer » ; utiliser une fois par vidéo sur un mot clé seulement.

### Style E : « Vertical Giant Word » (mot-décor géant vertical)
- Mot **LONDON** écrit à la verticale, énorme, collé au bord gauche du cadre : lettres en majuscules grasses condensées, en **dégradé bleu pétrole -> orange brûlé** avec texture usée (grain), et la photo de ville passe **à travers** les lettres (texte mi-incrusté devant le décor, texte derrière le sujet).
- **Police** : sans-serif **condensée très grasse** proche de **Anton**, **Bebas Neue** ou **Oswald** (OFL). Difficulté : **difficile** (texture, masque en profondeur derrière le sujet = détourage vidéo). C'est un titre de scène, pas un sous-titre ; à garder pour une future version « titre de chapitre ».
- **Qualité** : l'effet « texte derrière la personne » est ce qui fait pro ; nécessite détourage (segmentation), coûteux.

---

## v03 : motion_pet (16 s) : avant/après, interview d'une agente immobilière

**(1) Sujet** : même créateur que v02 ; fond orange/rouge de bureau. Style très coloré, plus « marque » : chaque mot fort a une couleur ou un dégradé différent.

### Style F : « Gradient Italic Heavy » (mots forts italiques gras en couleur + halo de mouvement)
- **Position** : centre-bas (au niveau du buste), 2 lignes (petit mot fin au-dessus, mot fort dessous).
- **Mots** : 2 à 3 (« why / NAN », « in house / production / team », « an / agent », « the / first / year »).
- **Mise en forme** : petits mots en **italique léger** (minuscules fines, inclinées), mots forts en **italique gras très lourd**, minuscules (ou majuscules pour la marque « NAN »), tailles 1x / 2,2x, interlignes serrés, parfois deux mots forts empilés (production / team) de couleurs différentes.
- **Police** : grotesque lourde en **italique oblique** type **Helvetica Neue Heavy Italic** ou **Neue Haas Grotesk Black Italic**. Libres proches : **Inter** (italique 800), **Archivo Black / Archivo Italic**, **Figtree Italic** (OFL) ; « Plus Jakarta Sans Italic 800 » aussi. Police d'origine probablement commerciale ; incertain.
- **Couleurs** : variables selon le sens : **orange-rouge ~ #FF5A1F** (NAN), **blanc** (production, team, international), **dégradé violet -> rose ~ #B061E8 -> #E84393** (team, agent, your), **bleu acier / gris-bleu ~ #6A8CA0** (network), **cyan clair ~ #8FD3F4** (largest), **magenta ~ #D4145A** (agent, first), **bleu-violet** pour d'autres. Les petits mots restent blanc.
- **Halo** : derrière le texte, une **tache orange-rouge floue ~ #FF4B14** (grande, rayon ~ 60 px, opacité ~ 60 %) qui flotte et anime comme du feu ; elle accompagne chaque mot fort, ce qui assure la lisibilité sur peau/fond clair.
- **Entrée** : le mot arrive avec **flou directionnel** (motion blur horizontal fort) puis se précise, échelle 85 % -> 100 %, légère inclinaison ; le décalage entre les mots est ~ 0,2 s. Les chiffres (« 4% / 13% / 24% / 30% ») **comptent** (compteur qui monte) avec une vague bleue qui monte derrière la personne (graphique de croissance).
- **Sortie** : fondu + flou en 0,15 s ; le texte suivant remplace sur la même ligne.
- **Mot actif** : le mot fort a la couleur + le halo, les autres sont blancs fins.
- **Effets** : halo-feu, dégradé de couleur sur lettre, **objets 3D / emojis** (points d'interrogation 3D bleus, anneau de drapeaux, icône de fusée, réseau de nœuds) qui accompagnent le mot ; ce sont des éléments de décor à part, pas du texte.
- **Difficulté** : **moyen** pour le texte (gradient text, blur, halo) ; **difficile** pour les objets 3D (assets externes).
- **Qualité** : l'italique lourd + dégradé couleur par mot + halo de même teinte que le décor = look « campagne de marque ». Proche de **Impact rouge** pour le coloris, mais l'italique + halo + gradient par mot est **nouveau**.

---

## v04 : WebflowOversight (22 s) : démo de site web Redsun (aucun sous-titre de parole)

**(1) Sujet** : vidéo d'un site web sombre (ordinateur, thème noir et orange) qui défile ; aucun sous-titre de parole, mais les **titres du site** ont une animation d'entrée intéressante.

### Style G (hors sous-titres) : « Scroll Reveal Heading »
- Titres de site (« Intelligent Solutions / Powered by AI. », « Helping you with fast-reading charts on the go », « Pricing Plans for Success », « Transform Your Work with Redsun ») : **blanc cassé** sur fond noir ~ #0B0B0E, **sans-serif ronde type Nunito / Mulish** (OFL), moyen/semi-gras, taille ~ 36-48 px.
- Animation : apparaissent **par ligne** avec fondu + flou (de 10 px à 0) + montée de 20-30 px ; à l'arrivée la ligne est parfois coupée par le cadre (« Intelligent Solution(s) » dépasse, c'est un zoom de caméra sur la maquette).
- Sortie : la page entière glisse vers le haut (scroll), le titre se floute puis disparaît.
- **Difficulté** : **facile** (même moteur que Quiet Stack). Pas de style nouveau pour les sous-titres. À retenir seulement : l'arc orange lumineux et la lueur douce sur fond noir (ambiance « halo orange ») comme fond de démo SemGen.

---

## v05 : abdigitalexpert (26 s) : promo d'agence marketing, présentatrice marchant dans un jardin

**(1) Sujet** : vidéo « talking head » en pied + éléments 3D en verre (icônes de recherche, réseaux). Sous-titres mixtes : sans-serif gras + italique Didone. Contient des mots en hindi translittéré (« kya aap ... ho? »).

### Style H : « Light Sans + Didone Italic » (mot fort en italique à empattements, mot normal en sans fin)
- **Position** : au niveau du ventre/torse de la personne (~ 60 % de la hauteur), centré ou légèrement décalé, 1 à 2 lignes ; la 2e ligne se superpose partiellement à la 1re.
- **Mots** : 1 à 3 à la fois (« Are you also looking », « for a digital », « marketing agency »).
- **Mise en forme** : mots normaux en **sans-serif régulier minuscules** ~ 36 px ; mot fort en **italique Didone gras** (« looking », « Mumbai? », « you », « marketing », « comment », « kya », « details », « will », « ho? »), ~ 1,5 x plus grand, ultra-contrasté, parfois avec un léger chevauchement avec la ligne du dessous.
- **Police 1** : sans-serif humaniste/grotesque régulière, proche **Inter / SF Pro** ; libres : **Inter**, **Figtree**, **Albert Sans** (OFL).
- **Police 2** : italique **Didone « fashion »** : déliés très fins, empattements aigus, ressemble à **Playfair Display Italic (Bold)**, **Bodoni Moda Italic**, **DM Serif Display Italic** (OFL). Possible police d'origine : « Ogg Italic » / « Gloock » : incertain.
- **Couleurs** : tout blanc pur, ombre portée douce sombre (~ rgba noir 40 %, flou 6 px), pas de contour ni de pastille.
- **Entrée** : mot par mot, petit fondu en 0,1-0,15 s, légère montée (8-10 px), pas de ressort. Le mot en italique est révélé avec un **léger flou qui se précise** (déjà « Mumbai? » apparaît flouté).
- **Sortie** : fondu rapide ; ligne suivante remplace.
- **Mot actif** : par changement de police (italique serif), pas par couleur.
- **Difficulté** : **facile** (deux familles de polices, fondu + translateY). Besoin d'un choix automatique du mot fort.
- **Qualité** : la simplicité (tout blanc, 2 polices) + l'élégance de l'italique donnent le côté « magazine de mode ». **Déjà couvert par Éditorial / Signature** (mélange sans + serif italique) : ne le refaire qu'avec une variante différente.

### Style I : « Heavy Sans Stack » (gros mot lourd + petit mot en dessous, blanc)
- **Position** : même zone (ventre), ligne du haut = gros mot en **sans-serif très gras (800-900)** blanc, ligne du dessous = 1 ou 2 mots en minuscules fines (« All / end to end », « digital / marketing », « place. », « down / that », « interested / and »).
- **Mise en forme** : gros mot en majuscule initiale (« All », « Please », « Down ») ou minuscules (« digital », « services », « interested ») ; taille ~ 1,6-2 x de la ligne du dessous. Le mot du dessous est plus fin, plus petit, **légèrement transparent** (60-70 %) ; il passe en pleine opacité quand il devient le mot fort suivant.
- **Police** : grotesque lourde proche de **Inter Black**, **Archivo**, **Plus Jakarta Sans 800**, **Figtree 800** (OFL) ; probablement Helvetica Neue Bold : commerciale (incertain).
- **Couleurs** : blanc ~ #FFFFFF, ombre noire douce sous le gros mot.
- **Entrée** : le gros mot apparaît avec un fondu + **scale 95 % -> 100 %** ; le petit mot arrive juste en dessous en fondu (pas de rebond). Pas de mouvement latéral.
- **Sortie** : fondu en 0,1 s ; le nouveau mot prend la place avec un changement instantané (rythme très rapide, 1 mot toutes les 0,3-0,5 s).
- **Difficulté** : **facile**. À régler : la règle « le gros mot = le mot qui vient d'être prononcé ; le petit = le précédent » (les deux lignes se décalent d'un cran à chaque mot : effet « ascenseur »).
- **Qualité** : l'effet « ascenseur » (le mot précédent descend et rapetisse) crée une lecture rythmée sans animer beaucoup. **Nouveau** : notre Pile à deux lignes planifiée correspond ; pas encore fait chez nous.

### Effets de décor vus (non typographiques, pour mémoire)
- Icônes 3D en verre qui tombent/orbitent, anneau de drapeaux, constellation d'icônes reliées par des lignes lumineuses, étincelles blanches/orange et explosion de lumière (v05 planche 2) : **difficile**, assets 3D. Pas à intégrer dans les sous-titres.
- Bandeau de logo rond en haut à droite (logo de marque tiers, non recopié).

---

## Résumé : styles uniques trouvés

1. **Quiet Stack** (pile de mots à hiérarchie de taille/poids, gris sur fond clair) : v01 ; titres similaires v04. Facile.
2. **Yellow Glow Pop** (petit mot blanc + mot fort jaune avec lueur et rayons en éventail) : v02. Moyen.
3. **Didone Flourish / Light Sans + Didone Italic** (sans fin + mot en italique Didone, balayage de masque) : v02, v05. Facile à moyen. **Déjà couvert par Éditorial / Signature** pour l'esprit.
4. **Echo Column** (mot répété en colonne verticale, traînée) : v02. Facile à moyen. NOUVEAU.
5. **Vertical Giant Word** (mot géant vertical en dégradé, texte derrière le sujet) : v02. Difficile (détourage). NOUVEAU mais hors sous-titres.
6. **Gradient Italic Heavy** (italique lourd, couleur/dégradé par mot, halo-feu flou, compteurs) : v03. Moyen. NOUVEAU.
7. **Scroll Reveal Heading** (titres UI, flou + montée, par ligne) : v04. Facile, hors sous-titres.
8. **Heavy Sans Stack / effet ascenseur** (gros mot lourd blanc + mot précédent en petit dessous) : v05. Facile. NOUVEAU.

Total : **8 styles distincts**, dont 5 réellement nouveaux pour SemGen (Yellow Glow Pop, Echo Column, Gradient Italic Heavy, Heavy Sans Stack, et Vertical Giant Word en option) ; 1 déjà couvert (Didone / Éditorial) ; 2 hors sous-titres (Scroll Reveal Heading, Quiet Stack comme titre).

## Polices à ajouter

Toutes OFL (Google Fonts, installables gratuitement) :

| Police | Rôle | Licence | Lien |
|---|---|---|---|
| Inter (poids 300 à 900, + italique) | sans principale, remplaçant d'Helvetica | OFL 1.1 | https://fonts.google.com/specimen/Inter |
| Archivo (variable, italique) | grotesque lourde alternative | OFL 1.1 | https://fonts.google.com/specimen/Archivo |
| Figtree (300-900, italique) | sans moderne, italique lourde pour Gradient Italic Heavy | OFL 1.1 | https://fonts.google.com/specimen/Figtree |
| Hanken Grotesk | grotesque proche de Helvetica Neue | OFL 1.1 | https://fonts.google.com/specimen/Hanken+Grotesk |
| Manrope / DM Sans | sans propres pour Quiet Stack | OFL 1.1 | https://fonts.google.com/specimen/Manrope et https://fonts.google.com/specimen/DM+Sans |
| Playfair Display (italique 400-900) | Didone italique pour Flourish | OFL 1.1 | https://fonts.google.com/specimen/Playfair+Display |
| Bodoni Moda (italique) | Didone fashion, déliés très fins | OFL 1.1 | https://fonts.google.com/specimen/Bodoni+Moda |
| Cormorant Garamond (italique) | italique fine élégante | OFL 1.1 | https://fonts.google.com/specimen/Cormorant+Garamond |
| DM Serif Display (italique) | Didone plus robuste | OFL 1.1 | https://fonts.google.com/specimen/DM+Serif+Display |
| Anton / Bebas Neue / Oswald | condensée pour Vertical Giant Word | OFL 1.1 | https://fonts.google.com/specimen/Anton |
| Nunito / Mulish | sans arrondie des titres de site (v04) | OFL 1.1 | https://fonts.google.com/specimen/Nunito |

Polices d'origine probablement **commerciales** à ne pas utiliser : Helvetica Neue / Neue Haas Grotesk (Monotype), Pp Editorial New (Pangram Pangram, usage perso gratuit seulement), Ogg (Sharp Type). Toutes les identifications ci-dessus sont par ressemblance visuelle : incertaines.
