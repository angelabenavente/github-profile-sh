import * as core from '@actions/core';
import * as github from '@actions/github';

import { DEFAULT_CONFIG_PATH, DEFAULT_OUTPUT_PATH } from './constants.js';
import { generateProfile } from './generate.js';
import { utcCalendarDate } from './today.js';

export type ActionIO = {
  getInput: (name: string, options?: { required?: boolean }) => string;
  getRepositoryOwner: () => string;
  setSecret: (value: string) => void;
  setOutput: (name: string, value: string) => void;
  setFailed: (message: string) => void;
  info: (message: string) => void;
  today?: string;
  cwd?: string;
  generate?: typeof generateProfile;
};

export function createDefaultIO(): ActionIO {
  return {
    getInput: (name, options) => core.getInput(name, options),
    getRepositoryOwner: () => github.context.repo.owner,
    setSecret: (value) => {
      core.setSecret(value);
    },
    setOutput: (name, value) => {
      core.setOutput(name, value);
    },
    setFailed: (message) => {
      core.setFailed(message);
    },
    info: (message) => {
      core.info(message);
    },
  };
}

export async function run(io: ActionIO = createDefaultIO()): Promise<void> {
  try {
    const token = io.getInput('token', { required: true });
    io.setSecret(token);

    const result = await (io.generate ?? generateProfile)({
      configPath: io.getInput('config') || DEFAULT_CONFIG_PATH,
      outputPath: io.getInput('output') || DEFAULT_OUTPUT_PATH,
      token,
      username: io.getRepositoryOwner(),
      today: io.today ?? utcCalendarDate(),
      cwd: io.cwd,
      log: io.info,
    });

    io.setOutput('svg-path', result.svgPath);
  } catch (error) {
    io.setFailed(error instanceof Error ? error.message : String(error));
  }
}
