# Composants et ressources tiers

> Tenir à jour à CHAQUE ajout (règle `CLAUDE.md` §10). Licences acceptées : MIT, ISC, Apache-2.0, BSD, OFL.

| Nom | Version | Licence | URL de la source | Date d'ajout | Où dans le projet |
|---|---|---|---|---|---|
| shadcn/ui | composants copiés | MIT | https://github.com/shadcn-ui/ui | 2026-10-17 | `src/components/ui/` |
| Lucide (`lucide-react`) | voir package.json | ISC | https://github.com/lucide-icons/lucide | 2026-10-17 | icônes |
| Geist + Geist Mono | via `next/font/google` | SIL OFL 1.1 (Vercel, avec basement.studio) | https://github.com/vercel/geist-font | 2026-10-17 (licence vérifiée 2026-10-18) | `src/app/[locale]/layout.tsx` |
| Plus Jakarta Sans | via `next/font/google` | SIL OFL 1.1 (The Plus Jakarta Sans Project Authors) | https://github.com/google/fonts/tree/main/ofl/plusjakartasans | 2026-10-18 | `src/app/[locale]/layout.tsx` |
| Remotion (`remotion`, `@remotion/player`, `@remotion/google-fonts`) | 4.0.536 | Licence Remotion : gratuite pour une personne, une entreprise ≤ 3 personnes ou une association ; licence entreprise payante au-delà (remotion.pro) — LICENSE.md lu le 2026-10-18 | https://github.com/remotion-dev/remotion | 2026-10-18 | `src/features/captions/` |
| Polices de sous-titres : Anton, Bebas Neue, Montserrat, Playfair Display, Poppins | via `@remotion/google-fonts` | SIL OFL 1.1 | https://fonts.google.com | 2026-10-18 | `src/features/captions/fonts.ts` |

## Rappels
- MIT / ISC : conserver la mention de copyright et le texte de la licence dans le code copié.
- OFL : usage commercial permis ; interdit de revendre la police seule.
- Remotion : licence payante si l'équipe dépasse 3 personnes.
