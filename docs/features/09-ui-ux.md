# F9 — Design, UX, landing

## Direction artistique
- Premium, moderne, « studio pro » : beaucoup d'espace, typographie forte, micro-animations fluides (Framer Motion), aucun aspect « template ».
- **Mode clair / sombre / système** sur toutes les pages, bascule visible dans la barre du haut, choix mémorisé.
- Couleurs définies en variables CSS (tokens) — jamais en dur dans les composants.

## Pages V1
- Landing : vidéo démo avant/après, styles animés en boucle, comparatif avec les concurrents, témoignages (réels uniquement), tarifs, FAQ, CTA « Essayer gratuitement — 10 crédits ».
- Connexion / inscription, tableau de bord, éditeur, crédits & paiements, paramètres (langue, thème, compte, suppression des données).
- Pages légales.

## Donner envie de rester
- Onboarding en 3 étapes avec une vidéo d'exemple déjà prête (l'utilisateur voit le résultat en 30 s sans uploader).
- Progression visible en temps réel avec messages sympas.
- Email de bienvenue + rappel si les crédits gratuits ne sont pas utilisés.

## Responsive et tests
- Testé par `qa-tester` sur : desktop 1440 px, tablette 768 px, mobile 390 px, en clair ET en sombre.
