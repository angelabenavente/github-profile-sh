import { describe, expect, it, vi } from 'vitest';

import { fetchContributionCalendar } from '../packages/core/src/github/calendar.js';

describe('fetchContributionCalendar', () => {
  it('flattens weeks into contribution days', async () => {
    const graphql = vi.fn().mockResolvedValue({
      user: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: [
              {
                contributionDays: [
                  { date: '2026-08-28', contributionCount: 1 },
                  { date: '2026-08-29', contributionCount: 4 },
                ],
              },
            ],
          },
        },
      },
    });

    await expect(
      fetchContributionCalendar({ graphql }, ' octocat ', {
        from: '2025-08-30',
        to: '2026-08-29',
      }),
    ).resolves.toEqual([
      { date: '2026-08-28', count: 1 },
      { date: '2026-08-29', count: 4 },
    ]);

    expect(graphql).toHaveBeenCalledWith(expect.any(String), {
      login: 'octocat',
      from: '2025-08-30T00:00:00.000Z',
      to: '2026-08-29T23:59:59.999Z',
    });
  });

  it('throws when the user does not exist', async () => {
    const graphql = vi.fn().mockResolvedValue({ user: null });

    await expect(
      fetchContributionCalendar({ graphql }, 'missing', {
        from: '2025-08-30',
        to: '2026-08-29',
      }),
    ).rejects.toThrowError('GitHub user not found: missing');
  });

  it('propagates GraphQL errors', async () => {
    const apiError = new Error('GraphQL error');
    const graphql = vi.fn().mockRejectedValue(apiError);

    await expect(
      fetchContributionCalendar({ graphql }, 'octocat', {
        from: '2025-08-30',
        to: '2026-08-29',
      }),
    ).rejects.toBe(apiError);
  });
});
