import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export function* getRelativeFilesOfDir(dir: string, prefix = ''): Generator<string> {
  const dirents = readdirSync(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const relative = join(prefix, dirent.name);

    if (dirent.isDirectory()) {
      yield* getRelativeFilesOfDir(resolve(dir, dirent.name), relative);
    } else {
      yield relative;
    }
  }
}
