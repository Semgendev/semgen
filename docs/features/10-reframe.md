# F12 — Recadrage intelligent (multi-formats)

## Objectif
Une vidéo tournée en 16:9 (YouTube, podcast) → prête en 9:16 (TikTok, Reels, Shorts), 1:1, 4:5 (feed Instagram/Facebook), 4:3, 21:9… et l'inverse — **sans couper la personne qui parle**.

## Modes
| Mode | Fonctionnement |
|---|---|
| Auto | Détection des visages / de la personne qui parle (MediaPipe + intervenant actif de la transcription) → la caméra virtuelle suit le sujet avec des mouvements lissés, sans à-coups |
| Podcast 2 personnes | Le cadre bascule sur celui qui parle ; option écran partagé (une personne en haut, une en bas) en 9:16 |
| Manuel | L'utilisateur déplace et zoome le cadre ; il peut poser des points clés sur la timeline |
| Remplissage | Si on agrandit le format (9:16 → 16:9) : fond flou de la vidéo, couleur unie ou image |

## Règles
- Les sous-titres se repositionnent automatiquement dans la zone sûre de chaque format (ne pas être caché par l'interface TikTok/Reels).
- Un projet = plusieurs formats ; **export de tous les formats en un clic**.
- Le recadrage est appliqué dans la composition Remotion (aperçu = export).
- Coût : inclus dans l'export (recadrage auto = +1 crédit / minute, voir `COSTS.md`).

## Tests attendus
- Vidéo test avec un sujet qui se déplace : le visage reste dans le cadre sur tout l'export.
- Formats extrêmes (21:9 → 9:16) sans déformation de l'image.
