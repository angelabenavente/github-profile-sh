import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export type GeneratedFileStatus = 'created' | 'overwritten' | 'skipped';

export async function writeGeneratedFile(
  path: string,
  content: string,
  confirmOverwrite: () => boolean | Promise<boolean>,
): Promise<GeneratedFileStatus> {
  const exists = await fileExists(path);

  if (exists) {
    if (!(await confirmOverwrite())) {
      return 'skipped';
    }

    await writeFile(path, content, { encoding: 'utf8' });
    return 'overwritten';
  }

  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, { encoding: 'utf8' });
  return 'created';
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
