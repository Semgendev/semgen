# F3 — Transcription

## Exigences
- **Détection automatique de la langue** parlée (99 langues via AssemblyAI) ; l'utilisateur peut forcer la langue si la détection se trompe.
- Timestamps **mot par mot** + score de confiance par mot (les mots peu sûrs sont surlignés pour vérification).
- Plusieurs intervenants (diarisation) : chaque mot sait qui parle → utile pour les podcasts.
- Conserver les disfluences (« euh », « hum ») dans les données brutes : elles servent au montage auto (F6) mais sont masquées des sous-titres par défaut.
- Ponctuation et majuscules automatiques.

## Langues africaines
- Vérifier la liste à jour des langues supportées par AssemblyAI (ex. swahili, haoussa, yoruba…).
- Si une langue n'est pas supportée en transcription : le proposer seulement en **langue de traduction** (F5), et l'indiquer clairement dans l'interface.

## Éditeur de transcription
- Corriger un mot (le timing est conservé), fusionner/scinder une ligne, rechercher/remplacer.

## Tests attendus
- Fixtures de réponses AssemblyAI (pas d'appel réel en tests) → parsing validé par Zod.
