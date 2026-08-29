import { animationTimings } from './timings.js';
import type { AnimationTimeline, CommandCharacterStep } from './types.js';

export type LineReveal = {
  startMs: number;
  durationMs: number;
};

export function lineRevealSchedule(
  timeline: AnimationTimeline,
): Map<number, LineReveal> {
  const reveals = new Map<number, LineReveal>();

  if (timeline.mode === 'none') {
    return reveals;
  }

  const commandCharacters = new Map<number, CommandCharacterStep[]>();

  for (const step of timeline.steps) {
    switch (step.type) {
      case 'commandReveal':
      case 'lineReveal':
      case 'languageReveal':
      case 'finalPrompt':
        reveals.set(step.lineIndex, {
          startMs: step.startMs,
          durationMs: step.durationMs,
        });
        break;
      case 'commandCharacter': {
        const characters = commandCharacters.get(step.lineIndex) ?? [];
        characters.push(step);
        commandCharacters.set(step.lineIndex, characters);
        break;
      }
      case 'cursorBlink':
        break;
    }
  }

  for (const [lineIndex, characters] of commandCharacters) {
    if (reveals.has(lineIndex)) {
      continue;
    }

    const first = characters[0];
    if (first === undefined) {
      continue;
    }

    reveals.set(lineIndex, {
      startMs: first.startMs,
      durationMs: animationTimings.commandRevealMs,
    });
  }

  return reveals;
}
