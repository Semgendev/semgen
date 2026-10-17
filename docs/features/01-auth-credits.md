# F1 — Comptes et crédits

## Parcours
1. Inscription par email (lien magique ou mot de passe) ou Google.
2. À la création du compte : +10 crédits (`credit_ledger`, reason `signup_bonus`) — une seule fois par compte.
3. Le solde est visible en permanence dans la barre du haut ; une page « Crédits » montre l'historique.

## Règles
- Anti-abus : 1 bonus par email vérifié ; rate limiting sur l'inscription ; emails jetables bloqués (liste).
- Coût en crédits affiché **avant** chaque action, avec confirmation si > 10 crédits.
- Solde insuffisant → modale « Recharger » vers les packs.

## Tests attendus
- Unitaires : calcul du solde, réservation, remboursement, double bonus impossible.
- E2E : inscription → 10 crédits visibles → déconnexion → reconnexion.
