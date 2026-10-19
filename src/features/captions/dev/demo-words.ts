import type { TranscriptWord } from "../../transcription/types";

// A short spoken-like script with realistic word timings (fast and slow words, pauses after
// punctuation), so every prototype can be judged on the same text in the animation lab.
const SCRIPT =
  "Tout ce temps, on a cru que c'était impossible. Regarde bien ce qui arrive maintenant ! " +
  "Trois secondes suffisent pour capter l'attention. Et ça, ça change absolument tout.";

export function demoWords(): TranscriptWord[] {
  const words: TranscriptWord[] = [];
  let time = 400;
  for (const text of SCRIPT.split(" ")) {
    // longer words take longer to say; punctuation adds a breath
    const duration = 170 + text.replace(/[^\p{L}\p{N}]/gu, "").length * 38;
    words.push({ text, start: time, end: time + duration, confidence: 1, speaker: null });
    time += duration + 40;
    if (/[,]$/.test(text)) time += 180;
    if (/[.!?]$/.test(text)) time += 520;
  }
  return words;
}
