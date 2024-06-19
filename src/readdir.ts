import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export async function* getFilesOfDir(dir: string): AsyncGenerator<string> {
  const dirents = readdirSync(dir, { withFileTypes: true });

  for (const dirent of dirents) {
    const res = resolve(dir, dirent.name);

    if (dirent.isDirectory()) {
      yield* getFilesOfDir(res);
    } else {
      yield res;
    }
  }
}
