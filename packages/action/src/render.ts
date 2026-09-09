import { createAnimationTimeline } from '@github-profile-sh/core/animation';
import type { ProfileConfig } from '@github-profile-sh/core/config/schema';
import {
  ExpectedError,
  getErrorMessage,
  isExpectedError,
} from '@github-profile-sh/core/errors';
import type { ProfileStats } from '@github-profile-sh/core/github';
import { renderTerminalSvg } from '@github-profile-sh/core/renderer';
import { buildTerminalOutput } from '@github-profile-sh/core/terminal';

export function renderProfileSvg(
  stats: ProfileStats,
  config: ProfileConfig,
): string {
  try {
    const terminal = buildTerminalOutput(stats, config);
    return renderTerminalSvg(terminal, {
      timeline: createAnimationTimeline(terminal, config.animation),
      theme: config.theme,
    });
  } catch (error) {
    if (isExpectedError(error)) {
      throw error;
    }

    throw new ExpectedError(
      `Unable to render profile SVG: ${getErrorMessage(error)}`,
      { cause: error },
    );
  }
}
