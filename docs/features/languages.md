# Langues — interface, transcription, traduction, doublage

> Demande d'Ashanti (18/10/2026) : « pas uniquement français et anglais ; toutes ces langues et même d'autres ». Il y a **quatre sujets différents** à ne pas confondre.

## 1. Langue de l'interface (menus, boutons) — `next-intl`
Aujourd'hui : FR, EN. Le système est prêt pour en ajouter (un fichier `messages/<code>.json` par langue).

**Cible au lancement public** (la liste vue chez Submagic + nos marchés) :
| Groupe | Langues |
|---|---|
| Déjà là | Français, English |
| Europe | Deutsch, Español, Português, Português (Brasil), Italiano, Nederlands, Polski, Română, Ελληνικά, Dansk, Slovenčina, Čeština, Magyar, Български, Türkçe, Русский, Українська |
| Asie | हिन्दी, 日本語, 한국어, 中文 (简体), Bahasa Indonesia, Tiếng Việt |
| Afrique / monde arabe | العربية (écriture de droite à gauche), Kiswahili, (plus tard : Yorùbá, Hausa, Wolof, Lingála selon la demande) |

Règles :
- Traduction des fichiers `messages/*.json` avec Claude (Haiku), puis relecture humaine pour les langues principales (FR, EN, ES, PT, AR).
- **Arabe = droite à gauche** : `dir="rtl"` sur `<html>`, mises en page en propriétés logiques (`ms-*`, `me-*`, `start`, `end`) — à prévoir dès maintenant dans les nouveaux composants.
- Polices : vérifier que l'interface couvre chaque alphabet (Geist = latin ; ajouter Noto Sans Arabic / Devanagari / JP / KR / SC si besoin, OFL).
- Un test vérifie que chaque fichier de langue a **exactement les mêmes clés** que `en.json`.

## 2. Transcription (langue parlée dans la vidéo)
- AssemblyAI : 99 langues, détection automatique (déjà en place).
- ElevenLabs Scribe pour les langues africaines où il est plus précis (prévu : yo, ha, ig, sw, wo, ln, am, zu…).

## 3. Traduction des sous-titres (le gros différenciateur)
- **Objectif : 100+ langues**, en 1 clic, plusieurs langues en lot (« Traduire en 20 langues »).
- Moteur : Claude Haiku (D… stack), avec les timestamps conservés segment par segment.
- Sélecteur : recherche, favoris, groupes par région (dont **langues africaines** mises en avant), coût total en crédits affiché avant.
- Chaque traduction = une nouvelle piste de sous-titres liée au projet (table `transcripts`, `is_original = false`).
- Export : une vidéo par langue, ou un fichier SRT/VTT par langue.

## 4. Doublage (voix)
- ElevenLabs Dubbing : ~30 langues. Uniquement la voix de l'utilisateur ou une voix de synthèse (règle éthique).

## Ordre proposé
1. Traduction des sous-titres (T5.x) — c'est ce qui fait gagner le plus d'audience.
2. Interface : ajout de l'espagnol, du portugais et de l'arabe (RTL) d'abord, puis le reste de la liste.
3. Doublage ensuite.
