# F7 — Doublage IA

## Fonctionnement
1. L'utilisateur choisit une ou plusieurs langues cibles.
2. Écran de consentement : « Je confirme que la voix est la mienne ou que j'ai l'autorisation de la personne. »
3. Envoi à ElevenLabs Dubbing → piste audio par langue, timing aligné sur l'original, voix et émotion conservées.
4. Sous-titres générés automatiquement dans la langue doublée.
5. Export : vidéo doublée + sous-titres (optionnels).

## Points d'attention
- C'est la fonction la plus chère (voir `COSTS.md`) : afficher le coût en crédits avant de lancer.
- Vérifier la version d'API disponible (v1 ou v2) au moment de coder et la liste des langues à jour.
- Mention « audio généré par IA » dans les métadonnées et en option à l'écran.
- Pas de doublage avec la voix d'une personnalité publique.
