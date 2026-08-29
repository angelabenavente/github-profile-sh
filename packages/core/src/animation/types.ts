export type AnimationMode = 'typing' | 'sequential' | 'none';

export type AnimationConfig = {
  enabled: boolean;
  mode: AnimationMode;
};

export type CommandCharacterStep = {
  type: 'commandCharacter';
  startMs: number;
  durationMs: number;
  lineIndex: number;
  charIndex: number;
  character: string;
};

export type CommandRevealStep = {
  type: 'commandReveal';
  startMs: number;
  durationMs: number;
  lineIndex: number;
};

export type LineRevealStep = {
  type: 'lineReveal';
  startMs: number;
  durationMs: number;
  lineIndex: number;
  lineType: 'status' | 'metric' | 'heading';
};

export type LanguageRevealStep = {
  type: 'languageReveal';
  startMs: number;
  durationMs: number;
  lineIndex: number;
};

export type FinalPromptStep = {
  type: 'finalPrompt';
  startMs: number;
  durationMs: number;
  lineIndex: number;
};

export type CursorBlinkStep = {
  type: 'cursorBlink';
  startMs: number;
  intervalMs: number;
};

export type AnimationStep =
  | CommandCharacterStep
  | CommandRevealStep
  | LineRevealStep
  | LanguageRevealStep
  | FinalPromptStep
  | CursorBlinkStep;

export type AnimationTimeline = {
  mode: AnimationMode;
  durationMs: number;
  steps: AnimationStep[];
};
