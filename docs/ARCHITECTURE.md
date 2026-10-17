# Architecture — SemGen Studio

## 1. Vue d'ensemble

```
Navigateur (Next.js, React, Remotion Player)
   │  upload direct (URL signée)          ┌──────────────┐
   ├────────────────────────────────────► │ Cloudflare R2│  vidéos, audios, exports
   │                                      └──────▲───────┘
   │  API (route handlers / server actions)      │
   ▼                                             │
Next.js serveur (Netlify) ── Supabase (Postgres + Auth + RLS)
   │  déclenche une tâche
   ▼
Trigger.dev (tâches longues, reprises auto)
   ├─ FFmpeg : extraction audio, découpes, normalisation
   ├─ AssemblyAI : transcription + détection langue + intervenants
   ├─ Claude Haiku : traduction segmentée, détection répétitions/prises ratées
   ├─ ElevenLabs : doublage
   └─ Remotion Lambda : rendu final MP4
   │  webhook / mise à jour BDD
   ▼
Supabase Realtime → le navigateur voit la progression en direct
```

**Principe clé :** une seule composition Remotion (`src/remotion/CaptionedVideo.tsx`) sert à l'aperçu ET à l'export → ce que l'utilisateur voit = ce qu'il exporte.

## 2. Modèle de données (Supabase)

| Table | Champs principaux |
|---|---|
| `profiles` | id (= auth.users.id), display_name, locale, country, theme, created_at |
| `credit_ledger` | id, user_id, delta (+/-), reason (`signup_bonus`, `purchase`, `job`, `refund`), job_id, payment_id, created_at — **solde = somme des deltas** (jamais de colonne solde modifiable) |
| `payments` | id, user_id, provider (`fedapay`/`pawapay`), provider_ref (UNIQUE), amount, currency, credits, status, raw_event, created_at |
| `projects` | id, user_id, title, status, source_video_key, duration_s, width, height, fps, detected_language, created_at, updated_at |
| `transcripts` | id, project_id, language, is_original, words JSONB (`[{text,start,end,speaker,confidence}]`), segments JSONB |
| `caption_tracks` | id, project_id, transcript_id, language, style_id, style_overrides JSONB, position JSONB, emphasized_words JSONB |
| `edit_decisions` | id, project_id, cuts JSONB (`[{start,end,reason}]`), accepted BOOLEAN |
| `reframes` | id, project_id, aspect_ratio, mode (`manual`/`auto`), keyframes JSONB (`[{t,x,y,zoom}]`), background (`blur`/`color`/`none`) |
| `dubs` | id, project_id, target_language, provider_job_id, audio_key, status |
| `jobs` | id, project_id, user_id, type (`transcribe`/`translate`/`autocut`/`dub`/`render`), status, progress, credits_reserved, error, created_at |
| `exports` | id, project_id, language, format, resolution, file_key, watermark, created_at |

Toutes les tables : RLS `user_id = auth.uid()` (directement ou via `projects`).

## 3. Cycle de vie des crédits

1. Avant une tâche : fonction Postgres `reserve_credits(job_id, amount)` → refuse si solde insuffisant (transaction + verrou).
2. Tâche réussie → réservation confirmée. Tâche échouée → `refund` automatique.
3. Paiement confirmé par webhook → `credit_ledger` +N (idempotent grâce à `provider_ref` UNIQUE).

## 4. Pipelines

- **Transcription** : upload → FFmpeg extrait l'audio (mono 16 kHz) → AssemblyAI (`language_detection`, `speaker_labels`, timestamps mot par mot, `disfluencies` activés) → stockage `transcripts`.
- **Traduction** : on traduit par **segment** (phrase) avec Claude Haiku, en JSON strict, en gardant les bornes start/end du segment → les mots traduits sont redistribués dans la durée du segment (proportionnellement au nombre de caractères) → même style, même position, nouveau `caption_track`.
- **Montage auto** : silences (seuil dB + durée min, via FFmpeg `silencedetect`) + mots de remplissage (liste par langue + disfluences AssemblyAI) + répétitions / prises ratées (Claude analyse les segments) → propositions de coupes que l'utilisateur **valide ou ajuste** → la timeline est recalculée.
- **Doublage** : ElevenLabs Dubbing → piste audio par langue → mixée à l'export ; sous-titres de la langue cible générés en plus.
- **Recadrage** : détection du visage / de la personne qui parle image par image (MediaPipe) → trajectoire de cadrage lissée → stockée dans `reframes` (keyframes x/y/zoom par format) → appliquée par la composition Remotion à l'aperçu et à l'export.
- **Rendu** : Remotion Lambda (composition + piste audio + coupes) → MP4 dans R2 → URL signée de téléchargement.

## 5. Paiements (interface commune)

```ts
interface PaymentProvider {
  createCheckout(input: { userId: string; packId: string; currency: string; country: string }): Promise<{ url: string; reference: string }>;
  verifyWebhook(req: Request): Promise<VerifiedPaymentEvent | null>;
}
```
Implémentations : `fedapay` (compte marchand béninois — cartes Visa/Mastercard du monde entier + MTN MoMo + Moov Money), `pawapay` (Mobile Money des autres pays d'Afrique : Orange, Wave, M-Pesa, Airtel…). Le choix du fournisseur se fait selon le pays et le moyen choisi par l'utilisateur. `kkiapay` peut être ajouté plus tard sans toucher au reste du code.

## 6. Environnements

`local` (Supabase local via CLI) → `preview` (chaque Pull Request, déploiement Netlify) → `production`. Clés séparées par environnement.
