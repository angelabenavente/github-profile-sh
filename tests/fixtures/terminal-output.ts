import type { TerminalOutput } from '../../packages/core/src/terminal/index.js';

export const completeOutput: TerminalOutput = {
  lines: [
    { type: 'command', prompt: '$', text: 'github-profile.sh' },
    { type: 'status', text: 'fetching public profile data...' },
    { type: 'blank' },
    { type: 'metric', label: 'repos', value: '42' },
    { type: 'metric', label: 'stars', value: '1.8k' },
    { type: 'metric', label: 'current streak', value: '21 days' },
    { type: 'metric', label: 'code changes', value: '8.4k' },
    { type: 'blank' },
    { type: 'heading', text: 'top languages' },
    { type: 'language', name: 'TypeScript', percentage: 62 },
    { type: 'language', name: 'Rust', percentage: 25 },
    { type: 'language', name: 'Go', percentage: 13 },
    { type: 'blank' },
    { type: 'prompt', prompt: '$' },
  ],
};

export const withoutLanguages: TerminalOutput = {
  lines: [
    { type: 'command', prompt: '$', text: 'github-profile.sh' },
    { type: 'status', text: 'fetching public profile data...' },
    { type: 'blank' },
    { type: 'metric', label: 'repos', value: '42' },
    { type: 'blank' },
    { type: 'prompt', prompt: '$' },
  ],
};
