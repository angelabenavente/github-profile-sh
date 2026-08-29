import { describe, expect, it } from 'vitest';

import {
  animationTimings,
  createAnimationTimeline,
  lineRevealSchedule,
  type AnimationConfig,
  type AnimationStep,
} from '../packages/core/src/animation/index.js';
import type { TerminalOutput } from '../packages/core/src/terminal/index.js';
import {
  completeOutput,
  withoutLanguages,
} from './fixtures/terminal-output.js';

const typing: AnimationConfig = { enabled: true, mode: 'typing' };
const sequential: AnimationConfig = { enabled: true, mode: 'sequential' };
const none: AnimationConfig = { enabled: true, mode: 'none' };

const withoutCodeChanges: TerminalOutput = {
  lines: [
    { type: 'command', prompt: '$', text: 'github-profile.sh' },
    { type: 'status', text: 'fetching public profile data...' },
    { type: 'blank' },
    { type: 'metric', label: 'repos', value: '42' },
    { type: 'metric', label: 'stars', value: '1.8k' },
    { type: 'blank' },
    { type: 'prompt', prompt: '$' },
  ],
};

function stepsOf<T extends AnimationStep['type']>(
  steps: AnimationStep[],
  type: T,
) {
  return steps.filter(
    (step): step is Extract<AnimationStep, { type: T }> => step.type === type,
  );
}

function stepStart(step: AnimationStep): number {
  return step.startMs;
}

describe('createAnimationTimeline', () => {
  it('types the command character by character', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const characters = stepsOf(timeline.steps, 'commandCharacter');

    expect(timeline.mode).toBe('typing');
    expect(stepsOf(timeline.steps, 'commandReveal')).toHaveLength(0);
    expect(characters.map((step) => step.character).join('')).toBe(
      'github-profile.sh',
    );
    expect(characters[0]).toMatchObject({
      charIndex: 0,
      character: 'g',
      startMs: 0,
      durationMs: animationTimings.typingCharMs,
    });
    expect(characters.at(-1)).toMatchObject({
      charIndex: 16,
      character: 'h',
      startMs: 16 * animationTimings.typingCharMs,
    });
    expect(
      characters.every(
        (step, index) =>
          index === 0 ||
          step.startMs ===
            (characters[index - 1]?.startMs ?? 0) +
              (characters[index - 1]?.durationMs ?? 0),
      ),
    ).toBe(true);
  });

  it('reveals the whole command at once in sequential mode', () => {
    const timeline = createAnimationTimeline(completeOutput, sequential);

    expect(timeline.mode).toBe('sequential');
    expect(stepsOf(timeline.steps, 'commandCharacter')).toHaveLength(0);
    expect(stepsOf(timeline.steps, 'commandReveal')).toEqual([
      {
        type: 'commandReveal',
        lineIndex: 0,
        startMs: 0,
        durationMs: animationTimings.commandRevealMs,
      },
    ]);
    expect(timeline.durationMs).toBeLessThan(
      createAnimationTimeline(completeOutput, typing).durationMs,
    );
  });

  it('treats none and disabled animation as immediately complete', () => {
    const disabled: AnimationConfig = { enabled: false, mode: 'typing' };

    for (const animation of [none, disabled]) {
      const timeline = createAnimationTimeline(completeOutput, animation);

      expect(timeline.mode).toBe('none');
      expect(timeline.durationMs).toBe(0);
      expect(stepsOf(timeline.steps, 'commandCharacter')).toHaveLength(0);
      expect(stepsOf(timeline.steps, 'lineReveal')).toHaveLength(0);
      expect(stepsOf(timeline.steps, 'languageReveal')).toHaveLength(0);
      expect(timeline.steps).toEqual([
        {
          type: 'cursorBlink',
          startMs: 0,
          intervalMs: animationTimings.cursorBlinkIntervalMs,
        },
      ]);
    }
  });

  it('reveals loading exactly once before metrics', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const loading = stepsOf(timeline.steps, 'lineReveal').filter(
      (step) => step.lineType === 'status',
    );
    const firstMetric = stepsOf(timeline.steps, 'lineReveal').find(
      (step) => step.lineType === 'metric',
    );

    expect(loading).toHaveLength(1);
    expect(completeOutput.lines[loading[0]?.lineIndex ?? -1]).toMatchObject({
      type: 'status',
      text: 'fetching public profile data...',
    });
    expect(loading[0]?.startMs).toBeLessThan(firstMetric?.startMs ?? -1);
  });

  it('reveals metrics in output order', () => {
    const metrics = stepsOf(
      createAnimationTimeline(completeOutput, typing).steps,
      'lineReveal',
    ).filter((step) => step.lineType === 'metric');

    expect(metrics.map((step) => completeOutput.lines[step.lineIndex])).toEqual(
      [
        { type: 'metric', label: 'repos', value: '42' },
        { type: 'metric', label: 'stars', value: '1.8k' },
        { type: 'metric', label: 'current streak', value: '21 days' },
        { type: 'metric', label: 'code changes', value: '8.4k' },
      ],
    );
    expect(metrics.map(stepStart)).toEqual(
      [...metrics.map(stepStart)].sort((left, right) => left - right),
    );
  });

  it('reveals languages in output order after the heading', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const heading = stepsOf(timeline.steps, 'lineReveal').find(
      (step) => step.lineType === 'heading',
    );
    const languages = stepsOf(timeline.steps, 'languageReveal');

    expect(heading).toBeDefined();
    expect(
      languages.map((step) => completeOutput.lines[step.lineIndex]),
    ).toEqual([
      { type: 'language', name: 'TypeScript', percentage: 62 },
      { type: 'language', name: 'Rust', percentage: 25 },
      { type: 'language', name: 'Go', percentage: 13 },
    ]);
    expect(heading?.startMs).toBeLessThan(languages[0]?.startMs ?? -1);
  });

  it('omits steps and section pauses when output lines are absent', () => {
    const withoutLanguagesTimeline = createAnimationTimeline(
      withoutLanguages,
      typing,
    );
    const withoutCodeChangesTimeline = createAnimationTimeline(
      withoutCodeChanges,
      typing,
    );

    expect(stepsOf(withoutLanguagesTimeline.steps, 'languageReveal')).toEqual(
      [],
    );
    expect(
      stepsOf(withoutLanguagesTimeline.steps, 'lineReveal').filter(
        (step) => step.lineType === 'heading',
      ),
    ).toEqual([]);
    expect(
      stepsOf(withoutCodeChangesTimeline.steps, 'lineReveal')
        .filter((step) => step.lineType === 'metric')
        .map((step) => withoutCodeChanges.lines[step.lineIndex]),
    ).toEqual([
      { type: 'metric', label: 'repos', value: '42' },
      { type: 'metric', label: 'stars', value: '1.8k' },
    ]);
    expect(withoutLanguagesTimeline.durationMs).toBeLessThan(
      createAnimationTimeline(completeOutput, typing).durationMs,
    );
  });

  it('places the final prompt after content and starts the cursor after it', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const content = timeline.steps.filter(
      (step) => step.type !== 'cursorBlink',
    );
    const prompt = stepsOf(timeline.steps, 'finalPrompt');
    const blink = stepsOf(timeline.steps, 'cursorBlink');
    const lastContent = content.at(-1);

    expect(prompt).toHaveLength(1);
    expect(blink).toHaveLength(1);
    expect(lastContent?.type).toBe('finalPrompt');
    expect(prompt[0]?.startMs).toBeGreaterThan(
      stepsOf(timeline.steps, 'languageReveal').at(-1)?.startMs ?? -1,
    );
    expect(blink[0]?.startMs).toBe(
      (prompt[0]?.startMs ?? 0) + (prompt[0]?.durationMs ?? 0),
    );
    expect(blink[0]?.intervalMs).toBe(animationTimings.cursorBlinkIntervalMs);
    expect(timeline.steps.at(-1)?.type).toBe('cursorBlink');
  });

  it('keeps command characters out of the line-reveal schedule in typing mode', () => {
    const typingSchedule = lineRevealSchedule(
      createAnimationTimeline(completeOutput, typing),
    );
    const sequentialSchedule = lineRevealSchedule(
      createAnimationTimeline(completeOutput, sequential),
    );

    expect(
      lineRevealSchedule(createAnimationTimeline(completeOutput, none)).size,
    ).toBe(0);
    expect(typingSchedule.get(0)).toBeUndefined();
    expect(sequentialSchedule.get(0)).toEqual({
      startMs: 0,
      durationMs: animationTimings.commandRevealMs,
    });
  });

  it('uses terminal-like pacing instead of even dashboard gaps', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const characters = stepsOf(timeline.steps, 'commandCharacter');
    const loading = stepsOf(timeline.steps, 'lineReveal').find(
      (step) => step.lineType === 'status',
    );
    const metrics = stepsOf(timeline.steps, 'lineReveal').filter(
      (step) => step.lineType === 'metric',
    );
    const heading = stepsOf(timeline.steps, 'lineReveal').find(
      (step) => step.lineType === 'heading',
    );
    const lastLanguage = stepsOf(timeline.steps, 'languageReveal').at(-1);
    const prompt = stepsOf(timeline.steps, 'finalPrompt')[0];
    const lastCharacter = characters.at(-1);
    const firstMetric = metrics[0];
    const secondMetric = metrics[1];

    const commandMs =
      (lastCharacter?.startMs ?? 0) + (lastCharacter?.durationMs ?? 0);
    const afterCommandMs = (loading?.startMs ?? 0) - commandMs;
    const afterLoadingMs =
      (firstMetric?.startMs ?? 0) -
      ((loading?.startMs ?? 0) + (loading?.durationMs ?? 0));
    const betweenMetricsMs =
      (secondMetric?.startMs ?? 0) -
      ((firstMetric?.startMs ?? 0) + (firstMetric?.durationMs ?? 0));
    const beforeLanguagesMs =
      (heading?.startMs ?? 0) -
      ((metrics.at(-1)?.startMs ?? 0) + (metrics.at(-1)?.durationMs ?? 0));
    const beforePromptMs =
      (prompt?.startMs ?? 0) -
      ((lastLanguage?.startMs ?? 0) + (lastLanguage?.durationMs ?? 0));

    expect(commandMs).toBeGreaterThanOrEqual(900);
    expect(commandMs).toBeLessThanOrEqual(1300);
    expect(afterCommandMs).toBeGreaterThan(0);
    expect(afterCommandMs).toBeLessThan(afterLoadingMs);
    expect(afterLoadingMs).toBeGreaterThan(betweenMetricsMs);
    expect(afterLoadingMs).toBeGreaterThan(beforeLanguagesMs);
    expect(betweenMetricsMs).toBeGreaterThan(0);
    expect(beforeLanguagesMs).toBeGreaterThan(betweenMetricsMs);
    expect(beforePromptMs).toBeGreaterThan(betweenMetricsMs);
    expect(loading?.startMs).toBeGreaterThan(commandMs);
    expect(heading?.startMs).toBeGreaterThan(metrics.at(-1)?.startMs ?? -1);
    expect(prompt?.startMs).toBeGreaterThan(lastLanguage?.startMs ?? -1);
    expect(
      createAnimationTimeline(completeOutput, sequential).durationMs,
    ).toBeLessThan(timeline.durationMs);
  });

  it('is monotonic, non-negative, deterministic, and one-shot', () => {
    const timeline = createAnimationTimeline(completeOutput, typing);
    const starts = timeline.steps.map(stepStart);

    expect(starts.every((startMs) => startMs >= 0)).toBe(true);
    expect(
      timeline.steps.every((step) =>
        step.type === 'cursorBlink'
          ? step.intervalMs > 0
          : step.durationMs >= 0,
      ),
    ).toBe(true);
    expect(starts).toEqual([...starts].sort((left, right) => left - right));
    expect(timeline.durationMs).toBeGreaterThanOrEqual(4000);
    expect(timeline.durationMs).toBeLessThanOrEqual(5500);
    expect(timeline.durationMs).toBe(
      stepsOf(timeline.steps, 'cursorBlink')[0]?.startMs,
    );
    expect(createAnimationTimeline(completeOutput, typing)).toEqual(timeline);
    expect(
      timeline.steps.filter((step) => step.type === 'cursorBlink'),
    ).toHaveLength(1);
  });
});
