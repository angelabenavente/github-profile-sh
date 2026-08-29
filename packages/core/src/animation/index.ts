export {
  commandCharacterSteps,
  finalCursorBlink,
  lineRevealSchedule,
  typingCursorHideMs,
} from './schedule.js';
export { createAnimationTimeline } from './timeline.js';
export { animationTimings } from './timings.js';
export type { LineReveal } from './schedule.js';
export type {
  AnimationConfig,
  AnimationMode,
  AnimationStep,
  AnimationTimeline,
  CommandCharacterStep,
  CommandRevealStep,
  CursorBlinkStep,
  FinalPromptStep,
  LanguageRevealStep,
  LineRevealStep,
} from './types.js';
