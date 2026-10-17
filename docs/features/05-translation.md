# F5 — Traduction en un clic

## Ce que veut Ashanti
« À 5 secondes je dis "Et depuis tout ce temps", je coche toutes les langues voulues, et en un clic tout est traduit, **sans que la position ni le rythme ne changent**. »

## Fonctionnement
1. L'utilisateur coche une ou plusieurs langues (100+ disponibles, recherche + langues favorites).
2. Pour chaque langue : traduction **segment par segment** (une phrase = un segment) avec Claude Haiku, sortie JSON validée par Zod (`[{segmentId, text}]`) — jamais de segment perdu ou fusionné.
3. Le segment traduit garde **exactement** les mêmes `start`/`end`. Les mots sont redistribués dans la durée du segment, proportionnellement à leur longueur → l'animation reste dans le tempo.
4. Le style, la position et les mots forts (retrouvés par correspondance de sens) sont copiés.
5. Dans l'éditeur, un menu « Langue » bascule instantanément entre les pistes ; on peut corriger chaque langue à la main.
6. Export : une vidéo par langue (ou toutes d'un coup en lot).

## Qualité
- Prompt de traduction : ton naturel parlé, pas de traduction mot à mot, garder les noms propres, longueur proche de l'original pour tenir dans le temps.
- Langues à écriture droite→gauche (arabe, hébreu, persan) : alignement correct.
- Polices compatibles avec toutes les écritures (Noto).
