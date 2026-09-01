const releaseTagPattern = /^v(\d+\.\d+\.\d+)$/;

export function packageVersionFromReleaseTag(tag: string): string {
  const match = releaseTagPattern.exec(tag.trim());

  if (match?.[1] == null) {
    throw new Error(
      `Unexpected release tag: ${tag}. Expected vX.Y.Z, for example v0.1.0.`,
    );
  }

  return match[1];
}
