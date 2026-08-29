export const initOutput = `github-profile.sh

Starting setup...`;

export function runInit(): void {
  process.stdout.write(`${initOutput}\n`);
}
