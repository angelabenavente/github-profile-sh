import type { ContributionDay } from './types.js';
import { normalizeGitHubUsername } from './username.js';

const contributionCalendarQuery = `
query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
`;

type GitHubCalendarClient = {
  graphql: (
    query: string,
    variables: {
      login: string;
      from: string;
      to: string;
    },
  ) => Promise<{
    user: {
      contributionsCollection: {
        contributionCalendar: {
          weeks: Array<{
            contributionDays: Array<{
              date: string;
              contributionCount: number;
            }>;
          }>;
        };
      };
    } | null;
  }>;
};

function shiftCalendarDay(date: string, delta: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const utc = new Date(Date.UTC(year, month - 1, day + delta));

  return [
    String(utc.getUTCFullYear()),
    String(utc.getUTCMonth() + 1).padStart(2, '0'),
    String(utc.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function contributionCalendarRange(today: string): {
  from: string;
  to: string;
} {
  return {
    from: shiftCalendarDay(today, -364),
    to: today,
  };
}

export async function fetchContributionCalendar(
  client: GitHubCalendarClient,
  username: string,
  range: { from: string; to: string },
): Promise<ContributionDay[]> {
  const login = normalizeGitHubUsername(username);
  const data = await client.graphql(contributionCalendarQuery, {
    login,
    from: `${range.from}T00:00:00.000Z`,
    to: `${range.to}T23:59:59.999Z`,
  });

  if (data.user === null) {
    throw new Error(`GitHub user not found: ${login}`);
  }

  return data.user.contributionsCollection.contributionCalendar.weeks.flatMap(
    (week) =>
      week.contributionDays.map((day) => ({
        date: day.date,
        count: day.contributionCount,
      })),
  );
}
