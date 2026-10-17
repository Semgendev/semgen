# Démarrage — guide pour Ashanti (à faire une seule fois)

## 1. Installer les outils sur ton ordinateur
1. **Node.js** (version LTS) → https://nodejs.org → télécharger « LTS » → installer.
2. **Git** → https://git-scm.com → installer (options par défaut).
3. **VS Code** → https://code.visualstudio.com.
4. Dans VS Code : onglet Extensions → installer **Claude Code**.
5. Créer un compte **GitHub** (gratuit).

## 2. Ouvrir le projet
1. Décompresser ce dossier `saas-video-ia` dans `Documents`.
2. VS Code → Fichier → Ouvrir le dossier → `saas-video-ia`.
3. Ouvrir Claude Code dans VS Code.

## 3. Premier message à envoyer à Claude Code (modèle : Opus)
> Lis CLAUDE.md puis docs/PROGRESS.md. Présente-moi le plan de la tâche T0.1 et attends ma validation.

Ensuite, à chaque nouvelle session :
> Lis CLAUDE.md et docs/PROGRESS.md, dis-moi où on en est et la prochaine étape.

## 4. Commandes utiles à dire à Claude
- « Lance le qa-tester sur la tâche qu'on vient de finir. »
- « Lance le security-auditor sur la phase 1. »
- « Utilise le bug-fixer pour corriger ce bug : … »
- « Mets à jour PROGRESS.md et dis-moi quel modèle utiliser pour la suite. »

## 5. Règles d'or
- Une tâche à la fois. Ne saute pas d'étape de la ROADMAP.
- Ne colle **jamais** une clé secrète dans le chat : mets-la dans le fichier `.env.local` (Claude te dira lequel et comment).
- Si Claude part dans une mauvaise direction : appuie sur Échap et réexplique.
- Ouvre une **nouvelle conversation** à chaque nouvelle tâche → ça économise énormément de tokens (CLAUDE.md + PROGRESS.md suffisent pour reprendre).
