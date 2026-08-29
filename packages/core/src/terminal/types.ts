export type TerminalCommandLine = {
  type: 'command';
  prompt: '$';
  text: 'github-profile.sh';
};

export type TerminalStatusLine = {
  type: 'status';
  text: 'fetching public profile data...';
};

export type TerminalMetricLine = {
  type: 'metric';
  label: string;
  value: string;
};

export type TerminalHeadingLine = {
  type: 'heading';
  text: string;
};

export type TerminalLanguageLine = {
  type: 'language';
  name: string;
  percentage: number;
};

export type TerminalPromptLine = {
  type: 'prompt';
  prompt: '$';
};

export type TerminalBlankLine = {
  type: 'blank';
};

export type TerminalLine =
  | TerminalCommandLine
  | TerminalStatusLine
  | TerminalMetricLine
  | TerminalHeadingLine
  | TerminalLanguageLine
  | TerminalPromptLine
  | TerminalBlankLine;

export type TerminalOutput = {
  lines: TerminalLine[];
};
