# F6 — Montage automatique (dérushage IA)

## Objectif
Une vidéo brute de 30 min → une version propre, rythmée et professionnelle, sans silences, sans « euh », sans répétitions ni prises ratées.

## Détections
| Type | Méthode |
|---|---|
| Silences | FFmpeg `silencedetect` (seuil et durée réglables : doux / normal / dynamique) |
| Mots de remplissage | Disfluences AssemblyAI + liste par langue (euh, hum, bah, um, uh, like…) |
| Bégaiements / mots répétés | Comparaison des mots consécutifs dans la transcription |
| Répétitions et prises ratées | Claude analyse les segments : quand une phrase est redite, garder **la dernière version complète** |
| Faux départs | Phrase coupée puis recommencée |

## Interface
- Chaque coupe proposée apparaît sur la timeline (couleur par type) avec sa raison et un score de confiance.
- L'utilisateur peut tout accepter en un clic, ou annuler une coupe précise.
- Aperçu avant/après.
- Micro-fondus audio (10–30 ms) à chaque coupe pour éviter les « clics ».
- Option « garder une respiration naturelle » (marge de 80–150 ms autour de la parole).

## Enchaînement
Le montage auto se fait **avant** les sous-titres : les timestamps des mots sont recalculés après les coupes.
