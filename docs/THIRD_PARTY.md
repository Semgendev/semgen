# Composants et ressources tiers

> Tenir à jour à CHAQUE ajout (règle `CLAUDE.md` §10). Licences acceptées : MIT, ISC, Apache-2.0, BSD, OFL.

| Nom | Version | Licence | URL de la source | Date d'ajout | Où dans le projet |
|---|---|---|---|---|---|
| shadcn/ui | composants copiés | MIT | https://github.com/shadcn-ui/ui | 2026-10-17 | `src/components/ui/` |
| Lucide (`lucide-react`) | voir package.json | ISC | https://github.com/lucide-icons/lucide | 2026-10-17 | icônes |
| Geist + Geist Mono | via `next/font/google` | SIL OFL 1.1 (Vercel, avec basement.studio) | https://github.com/vercel/geist-font | 2026-10-17 (licence vérifiée 2026-10-18) | `src/app/[locale]/layout.tsx` |
| Plus Jakarta Sans | via `next/font/google` | SIL OFL 1.1 (The Plus Jakarta Sans Project Authors) | https://github.com/google/fonts/tree/main/ofl/plusjakartasans | 2026-10-18 | `src/app/[locale]/layout.tsx` |
| Remotion (`remotion`, `@remotion/player`, `@remotion/google-fonts`) | 4.0.536 | Licence Remotion : gratuite pour une personne, une entreprise ≤ 3 personnes ou une association ; licence entreprise payante au-delà (remotion.pro) — LICENSE.md lu le 2026-10-18 | https://github.com/remotion-dev/remotion | 2026-10-18 | `src/features/captions/` |
| Polices de sous-titres : Anton, Bebas Neue, Montserrat, Playfair Display, Poppins | hébergées sur notre site (`public/fonts/captions/`) | SIL OFL 1.1 | https://fonts.google.com | 2026-10-18 | `src/features/captions/fonts.ts` |
| Remotion Lambda (`@remotion/lambda`, `@remotion/cli`, devDependencies, export T4.4) | 4.0.536 | Même licence Remotion que ci-dessus (D14) | https://github.com/remotion-dev/remotion | 2026-10-22 | `package.json` |
| Polices de sous-titres : Instrument Serif, Inter Tight, Pinyon Script, Manrope, Bricolage Grotesque, Fraunces, Syne, Sora, DM Serif Display, Outfit, Anybody | hébergées sur notre site (`public/fonts/captions/`, script `scripts/host-caption-fonts.mjs`, source `@remotion/google-fonts`) | SIL OFL 1.1 | https://fonts.google.com | 2026-10-19 | `src/features/captions/fonts.ts` |
| Polices de sous-titres : Inter, Figtree, Newsreader, Bodoni Moda | hébergées sur notre site (`public/fonts/captions/`, script `scripts/host-caption-fonts.mjs`, source `@remotion/google-fonts`) | SIL OFL 1.1 | https://fonts.google.com | 2026-10-21 | `src/features/captions/fonts.ts` |
| Noto Sans Arabic (interface en arabe, lettres arabes seulement) | fichier variable v33 hébergé chez nous (`src/app/fonts/noto-sans-arabic.woff2`, 166 Ko, chargé seulement quand une page affiche de l'arabe) | SIL OFL 1.1 (The Noto Project Authors) | https://github.com/notofonts/arabic | 2026-10-19 | `src/app/[locale]/layout.tsx` |
| Cairo (lettres arabes de tous les styles de sous-titres) | fichier variable v31 hébergé chez nous (`public/fonts/captions/`, 31 Ko, chargé seulement si le texte est en arabe) | SIL OFL 1.1 (The Cairo Project Authors) | https://github.com/Gue3bara/Cairo | 2026-10-19 | `src/features/captions/fonts.ts` |
| Noto Sans Devanagari (interface en hindi + lettres devanagari des sous-titres) | fichiers variables v30 hébergés chez nous (`src/app/fonts/noto-sans-devanagari.woff2` 121 Ko et `public/fonts/captions/`, chargés seulement sur les pages / textes en hindi) | SIL OFL 1.1 (The Noto Project Authors) | https://github.com/notofonts/devanagari | 2026-10-19 | `src/app/[locale]/layout.tsx`, `src/features/captions/fonts.ts` |
| AWS SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, copies de travail T4.4) | 3.986.0 | Apache-2.0 | https://github.com/aws/aws-sdk-js-v3 | 2026-10-22 | `src/lib/aws/working-copy-storage.ts` |

## Rappels
- MIT / ISC : conserver la mention de copyright et le texte de la licence dans le code copié.
- OFL : usage commercial permis ; interdit de revendre la police seule.
- Remotion : licence payante si l'équipe dépasse 3 personnes.
