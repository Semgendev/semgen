# Sécurité — checklist (vérifiée par `security-auditor` à chaque phase)

## Données et accès
- [ ] RLS activée sur toutes les tables, policies testées (un utilisateur A ne voit jamais les données de B)
- [ ] La clé `service_role` Supabase n'est utilisée que côté serveur
- [ ] Aucune clé secrète dans le code, les logs, ou les variables `NEXT_PUBLIC_*`
- [ ] `.env*` dans `.gitignore`

## Crédits et argent
- [ ] Solde calculé depuis `credit_ledger` uniquement, modifications via fonctions Postgres `SECURITY DEFINER`
- [ ] Réservation des crédits avant toute tâche payante, remboursement automatique si échec
- [ ] Webhooks : signature vérifiée, `provider_ref` UNIQUE (idempotence), montant et devise revérifiés côté serveur
- [ ] Les prix viennent du serveur, jamais du client

## Uploads et fichiers
- [ ] Contrôle du type réel (magic bytes / ffprobe), taille max, durée max par plan
- [ ] URLs signées courtes (≤ 15 min), buckets privés
- [ ] Suppression des fichiers d'un projet supprimé + purge automatique des fichiers temporaires

## Application
- [ ] Validation Zod de toutes les entrées
- [ ] Rate limiting (Upstash) sur auth, upload, transcription, traduction, doublage, rendu
- [ ] En-têtes de sécurité (CSP, HSTS, X-Frame-Options), cookies `HttpOnly` + `Secure`
- [ ] Protection CSRF sur les actions sensibles
- [ ] `npm audit` sans faille haute/critique, dépendances à jour (Dependabot)

## Conformité
- [ ] RGPD : export et suppression du compte, politique de confidentialité, consentement cookies
- [ ] Mention « généré par IA » pour le doublage
- [ ] Consentement explicite avant clonage de la voix de l'utilisateur
