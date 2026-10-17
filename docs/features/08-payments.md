# F8 — Paiements internationaux (entreprise basée au Bénin)

## Moyens de paiement
| Région | Moyen | Fournisseur |
|---|---|---|
| Monde entier (Europe, Amériques, Asie, Afrique…) | Visa, Mastercard (cartes internationales) | FedaPay |
| Bénin | MTN MoMo, Moov Money (Celtiis si disponible) | FedaPay |
| Autres pays d'Afrique (CI, Sénégal, Togo, Burkina, Cameroun, Ghana, Kenya…) | Orange Money, MTN, Moov, Wave, M-Pesa, Airtel… | pawaPay |

> Avant de coder T8 : vérifier avec chaque fournisseur (1) les conditions d'ouverture d'un compte marchand pour une activité au Bénin (statut entrepreneur / IFU, RCCM…), (2) la couverture exacte des pays et opérateurs, (3) les frais, (4) les paiements récurrents. Alternative locale : KKiaPay. Option future si une société est créée à l'étranger : Stripe pour l'Europe/USA.

## Parcours
1. L'utilisateur choisit un pack → le pays est détecté (modifiable) → moyens de paiement locaux affichés en premier.
2. Paiement sur la page sécurisée du fournisseur (aucune donnée de carte chez nous).
3. Webhook signé → crédits ajoutés → email de reçu (Resend) → page de succès.

## Règles
- Prix de référence stockés côté serveur en USD ; affichage converti en devise locale (XOF/FCFA, EUR, USD, NGN, GHS, KES…). Le montant réellement débité est celui confirmé par le fournisseur.
- Idempotence : `payments.provider_ref` UNIQUE.
- Paiements Mobile Money « en attente » (validation sur le téléphone) : statut en temps réel + vérification côté serveur en relance (les callbacks peuvent se perdre).
- Remboursement : politique écrite, crédits retirés du ledger.
