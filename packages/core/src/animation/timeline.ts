import type { TerminalLine, TerminalOutput } from '../terminal/types.js';

import { animationTimings } from './timings.js';
import type {
  AnimationConfig,
  AnimationMode,
  AnimationStep,
  AnimationTimeline,
  LineRevealStep,
} from './types.js';

function resolveMode(animation: AnimationConfig): AnimationMode {
  if (!animation.enabled || animation.mode === 'none') {
    return 'none';
  }

  return animation.mode;
}

function createClock() {
  let nowMs = 0;

  return {
    now(): number {
      return nowMs;
    },
    wait(durationMs: number): void {
      nowMs += durationMs;
    },
    take(durationMs: number): { startMs: number; durationMs: number } {
      const startMs = nowMs;
      nowMs += durationMs;
      return { startMs, durationMs };
    },
  };
}

function indicesOf<T extends TerminalLine['type']>(
  lines: readonly TerminalLine[],
  type: T,
): number[] {
  return lines.flatMap((line, index) => (line.type === type ? [index] : []));
}

function revealLine(
  steps: AnimationStep[],
  clock: ReturnType<typeof createClock>,
  lineIndex: number,
  lineType: LineRevealStep['lineType'],
): void {
  steps.push({
    type: 'lineReveal',
    lineIndex,
    lineType,
    ...clock.take(animationTimings.lineRevealMs),
  });
}

function revealLanguages(
  steps: AnimationStep[],
  clock: ReturnType<typeof createClock>,
  headingIndices: number[],
  languageIndices: number[],
): void {
  for (const [offset, lineIndex] of headingIndices.entries()) {
    if (offset > 0) {
      clock.wait(animationTimings.pauseBetweenLanguagesMs);
    }

    revealLine(steps, clock, lineIndex, 'heading');
  }

  for (const [offset, lineIndex] of languageIndices.entries()) {
    if (offset > 0 || headingIndices.length > 0) {
      clock.wait(animationTimings.pauseBetweenLanguagesMs);
    }

    steps.push({
      type: 'languageReveal',
      lineIndex,
      ...clock.take(animationTimings.lineRevealMs),
    });
  }
}

function appendCursorBlink(
  steps: AnimationStep[],
  startMs: number,
): AnimationStep[] {
  steps.push({
    type: 'cursorBlink',
    startMs,
    intervalMs: animationTimings.cursorBlinkIntervalMs,
  });

  return steps;
}

function createNoneTimeline(): AnimationTimeline {
  return {
    mode: 'none',
    durationMs: 0,
    steps: appendCursorBlink([], 0),
  };
}

function emitCommand(
  steps: AnimationStep[],
  clock: ReturnType<typeof createClock>,
  output: TerminalOutput,
  mode: Exclude<AnimationMode, 'none'>,
): void {
  const lineIndex = output.lines.findIndex((line) => line.type === 'command');
  const command = output.lines[lineIndex];

  if (lineIndex === -1 || command?.type !== 'command') {
    return;
  }

  if (mode === 'sequential') {
    steps.push({
      type: 'commandReveal',
      lineIndex,
      ...clock.take(animationTimings.commandRevealMs),
    });
    return;
  }

  for (const [charIndex, character] of command.text.split('').entries()) {
    steps.push({
      type: 'commandCharacter',
      lineIndex,
      charIndex,
      character,
      ...clock.take(animationTimings.typingCharMs),
    });
  }
}

export function createAnimationTimeline(
  output: TerminalOutput,
  animation: AnimationConfig,
): AnimationTimeline {
  const mode = resolveMode(animation);

  if (mode === 'none') {
    return createNoneTimeline();
  }

  const clock = createClock();
  const steps: AnimationStep[] = [];
  const statusIndices = indicesOf(output.lines, 'status');
  const metricIndices = indicesOf(output.lines, 'metric');
  const headingIndices = indicesOf(output.lines, 'heading');
  const languageIndices = indicesOf(output.lines, 'language');
  const promptIndices = indicesOf(output.lines, 'prompt');
  const hasLanguages = headingIndices.length > 0 || languageIndices.length > 0;

  emitCommand(steps, clock, output, mode);
  clock.wait(animationTimings.pauseAfterCommandMs);

  for (const lineIndex of statusIndices) {
    revealLine(steps, clock, lineIndex, 'status');
  }

  if (metricIndices.length > 0) {
    clock.wait(animationTimings.pauseAfterLoadingMs);

    for (const [offset, lineIndex] of metricIndices.entries()) {
      if (offset > 0) {
        clock.wait(animationTimings.pauseBetweenMetricsMs);
      }

      revealLine(steps, clock, lineIndex, 'metric');
    }
  }

  if (hasLanguages) {
    clock.wait(
      metricIndices.length > 0
        ? animationTimings.pauseBeforeLanguagesMs
        : animationTimings.pauseAfterLoadingMs,
    );
    revealLanguages(steps, clock, headingIndices, languageIndices);
  }

  clock.wait(animationTimings.pauseBeforePromptMs);

  for (const lineIndex of promptIndices) {
    steps.push({
      type: 'finalPrompt',
      lineIndex,
      ...clock.take(animationTimings.lineRevealMs),
    });
  }

  return {
    mode,
    durationMs: clock.now(),
    steps: appendCursorBlink(steps, clock.now()),
  };
}
