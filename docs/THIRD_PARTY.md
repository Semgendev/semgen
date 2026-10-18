# Composants et ressources tiers

> Tenir à jour à CHAQUE ajout (règle `CLAUDE.md` §10). Licences acceptées : MIT, ISC, Apache-2.0, BSD, OFL.

| Nom | Version | Licence | URL de la source | Date d'ajout | Où dans le projet |
|---|---|---|---|---|---|
| shadcn/ui | composants copiés | MIT | https://github.com/shadcn-ui/ui | 2026-10-17 | `src/components/ui/` |
| Lucide (`lucide-react`) | voir package.json | ISC | https://github.com/lucide-icons/lucide | 2026-10-17 | icônes |
| Geist + Geist Mono | via `next/font/google` | SIL OFL 1.1 (Vercel, avec basement.studio) | https://github.com/vercel/geist-font | 2026-10-17 (licence vérifiée 2026-10-18) | `src/app/[locale]/layout.tsx` |
| Plus Jakarta Sans | via `next/font/google` | SIL OFL 1.1 (The Plus Jakarta Sans Project Authors) | https://github.com/google/fonts/tree/main/ofl/plusjakartasans | 2026-10-18 | `src/app/[locale]/layout.tsx` |
| Remotion | pas encore installé | Licence spéciale Remotion (gratuite ≤ 3 personnes) | https://github.com/remotion-dev/remotion | — | relire `LICENSE.md` avant T4.1 |

## Rappels
- MIT / ISC : conserver la mention de copyright et le texte de la licence dans le code copié.
- OFL : usage commercial permis ; interdit de revendre la police seule.
- Remotion : licence payante si l'équipe dépasse 3 personnes.
