# F2 — Upload et projets

## Parcours
1. Glisser-déposer ou choisir une vidéo (MP4, MOV, WEBM, MKV).
2. Upload direct navigateur → R2 (multipart, reprise si la connexion coupe — important pour les connexions mobiles lentes).
3. Analyse serveur (ffprobe) : durée, résolution, fps, présence d'audio.
4. Le projet apparaît dans le tableau de bord avec une miniature et son statut en temps réel.

## Limites par plan
| Plan | Taille max | Durée max |
|---|---|---|
| Gratuit | 200 Mo | 3 min |
| Payant | 2 Go | 60 min |

## Tests attendus
- Fichier trop gros / mauvais format refusé avec message clair (FR/EN).
- E2E : upload d'une vidéo de test de 10 s → projet visible.
