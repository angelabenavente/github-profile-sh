import type { AnimationTimeline, CommandCharacterStep } from './types.js';

export type LineReveal = {
  startMs: number;
  durationMs: number;
};

export function commandCharacterSteps(
  timeline: AnimationTimeline,
): CommandCharacterStep[] {
  if (timeline.mode !== 'typing') {
    return [];
  }

  return timeline.steps.filter(
    (step): step is CommandCharacterStep => step.type === 'commandCharacter',
  );
}

export function typingCursorHideMs(
  timeline: AnimationTimeline,
): number | undefined {
  if (commandCharacterSteps(timeline).length === 0) {
    return undefined;
  }

  const next = timeline.steps.find(
    (step) =>
      step.type === 'lineReveal' ||
      step.type === 'languageReveal' ||
      step.type === 'finalPrompt',
  );

  return next?.startMs;
}

export function lineRevealSchedule(
  timeline: AnimationTimeline,
): Map<number, LineReveal> {
  const reveals = new Map<number, LineReveal>();

  if (timeline.mode === 'none') {
    return reveals;
  }

  const typedLines = new Set(
    commandCharacterSteps(timeline).map((step) => step.lineIndex),
  );

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
      case 'commandCharacter':
      case 'cursorBlink':
        break;
    }
  }

  for (const lineIndex of typedLines) {
    reveals.delete(lineIndex);
  }

  return reveals;
}
