import type { TranscriptWord } from "../../transcription/types";

// A short spoken-like script with realistic word timings (fast and slow words, pauses after
// punctuation), so every prototype can be judged on the same text in the animation lab.
const SCRIPT =
  "Salut, je viendrai chez toi demain ! " +
  "Tout ce temps, on a cru que c'était impossible. Regarde bien ce qui arrive maintenant ! " +
  "Trois secondes suffisent pour capter l'attention. Et ça, ça change absolument tout.";

// Two short captions looped on each style card of the gallery, in the language of the interface.
const PREVIEW_SCRIPTS: Record<string, string> = {
  fr: "Salut, je viendrai chez toi demain ! La qualité, d'un seul coup.",
  en: "Hey, I will come over tomorrow! Quality, in one go.",
  es: "¡Hola, mañana voy a tu casa! La calidad, de un solo golpe.",
};

// Languages that have a demo text (checked against the interface languages by a test).
export const PREVIEW_LOCALES = Object.keys(PREVIEW_SCRIPTS);

export function previewWords(locale: string): TranscriptWord[] {
  return timed(PREVIEW_SCRIPTS[locale] ?? PREVIEW_SCRIPTS.en ?? "", 100);
}

export function demoWords(): TranscriptWord[] {
  return timed(SCRIPT, 400);
}

function timed(script: string, startMs: number): TranscriptWord[] {
  const words: TranscriptWord[] = [];
  let time = startMs;
  for (const text of script.split(" ")) {
    // longer words take longer to say; punctuation adds a breath
    const duration = 170 + text.replace(/[^\p{L}\p{N}]/gu, "").length * 38;
    words.push({ text, start: time, end: time + duration, confidence: 1, speaker: null });
    time += duration + 40;
    if (/[,]$/.test(text)) time += 180;
    if (/[.!?]$/.test(text)) time += 520;
  }
  return words;
}
