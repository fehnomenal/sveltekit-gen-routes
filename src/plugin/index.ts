import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { type Plugin } from 'vite';
import { name } from '../../package.json';
import { getIndexCodeLines, getRouteKeyCodeLines } from './code.js';
import { getDeclarationFileContentLines } from './declaration.js';
import { getRelativeFilesOfDir } from './readdir.js';
import {
  getFileTypeFromFileName,
  getRouteId,
  getRouteTypeFromFileType,
  resolveRouteInfo,
} from './resolve.js';
import type { AllRoutesMeta, Config, Route } from './types.js';
import { isDebug, isInSubdir, joinLines, makeRelativePath } from './utils.js';

export const sveltekitRoutes = <Meta extends AllRoutesMeta = AllRoutesMeta>({
  moduleName = '$routes',
  routesDir = join('.', 'src', 'routes'),
  paramMatchersDir = join('.', 'src', 'params'),
  outputDir = join('.', 'src'),
  forceRootRoute = true,

  debug,
  ...routesConfig
}: Config<Meta> = {}): Plugin => {
  const routes: Route[] = [];

  routesDir = resolve(routesDir);
  paramMatchersDir = resolve(paramMatchersDir);
  outputDir = resolve(outputDir);

  const declarationFilePath = resolve(outputDir, `${moduleName}.d.ts`);

  const relativeOutputDir = makeRelativePath('.', outputDir);
  const routeIndexModuleId = makeRelativePath('.', resolve(outputDir, `${moduleName}.js`));
  const routeModuleIdPrefix = resolve(outputDir, moduleName);

  let isDev = false;
  let latestUpdate = 0;

  const writeFileContents = (file: string, contents: string | string[]) => {
    if (Array.isArray(contents)) {
      contents = joinLines(contents);
    }

    if (existsSync(file)) {
      const oldContents = readFileSync(file, { encoding: 'utf-8' });

      if (oldContents === contents) {
        return;
      }
    }

    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, contents, { encoding: 'utf-8' });
  };

  const resolveAllRoutes = () => {
    for (const file of getRelativeFilesOfDir(routesDir)) {
      const routeId = getRouteId(file);

      const fileType = getFileTypeFromFileName(file);
      if (fileType) {
        resolveRouteInfo(
          routeId,
          fileType,
          () => readFileSync(resolve(routesDir, file), { encoding: 'utf-8' }),
          routes,
        );
      }
    }

    if (forceRootRoute) {
      resolveRouteInfo('/', 'PAGE_COMPONENT', () => '', routes);
    }
  };

  const handleUpdatedRoutes = () => {
    latestUpdate = Date.now();

    const lines = getDeclarationFileContentLines(
      moduleName,
      declarationFilePath,
      paramMatchersDir,
      routes,
      routesConfig,
    );
    writeFileContents(declarationFilePath, lines);
  };

  return {
    name,

    config(_config, env) {
      isDev = env.command === 'serve';
    },

    async watchChange(id, change) {
      if (!isInSubdir(routesDir, id)) {
        return;
      }

      const fileType = getFileTypeFromFileName(id);

      if (fileType) {
        const routeId = getRouteId(relative(routesDir, id));

        if (change.event === 'delete') {
          if (fileType === 'PAGE_COMPONENT' || fileType === 'PAGE_SCRIPT') {
            // The route may only be removed if there is neither a page component nor a page script file
            // remaining. Instead of testing for existing files, we just rebuild the routes array.
            // TODO: Improve this if it ever becomes a performance problem.

            routes.splice(0, routes.length);
            resolveAllRoutes();
          } else {
            const routeType = getRouteTypeFromFileType(fileType);
            const idxToRemove = routes.findIndex((r) => r.type === routeType && r.routeId === routeId);

            if (idxToRemove === -1) {
              return;
            }

            routes.splice(idxToRemove, 1);
          }
        } else {
          resolveRouteInfo(routeId, fileType, () => readFileSync(id, { encoding: 'utf-8' }), routes);
        }

        handleUpdatedRoutes();
      }
    },

    async buildStart() {
      resolveAllRoutes();
      handleUpdatedRoutes();
    },

    resolveId(id) {
      if (!id.includes(moduleName)) {
        // We handle plugin modules only...
        return;
      }

      let outputId: string;

      if (id === moduleName) {
        // Index file.
        outputId = routeIndexModuleId;
      } else if (id.startsWith(`./${moduleName}/`) && id.endsWith('.js')) {
        // Route file.
        outputId = join(relativeOutputDir, id);
      } else {
        return;
      }

      if (isDev) {
        outputId += `?${latestUpdate}`;
      }

      return { id: outputId, moduleSideEffects: false };
    },

    load(id) {
      if (!id.includes(moduleName)) {
        // We handle plugin modules only...
        return;
      }

      if (isDev) {
        const searchIdx = id.indexOf('?');
        if (searchIdx > -1) {
          id = id.slice(0, searchIdx);
        }
      }

      // With debug mode files are written to disc and rollup resolves their path for us. This confuses the
      // logic below that does simple string comparisons. This cannot be if-guarded as it would fail if the
      // debug mode is enabled and then disabled without the files being deleted.
      id = makeRelativePath('.', id);

      let codeLines: string[];

      if (id === routeIndexModuleId) {
        codeLines = getIndexCodeLines(routes, routesConfig, moduleName);
      } else if (isInSubdir(routeModuleIdPrefix, id) && id.endsWith('.js')) {
        const routeKey = basename(id, '.js');

        const filteredRoutes = routes.filter((r) => r.key === routeKey);

        codeLines = getRouteKeyCodeLines(filteredRoutes, routesConfig);
      } else {
        return;
      }

      const code = joinLines(codeLines);

      if (isDebug(debug, 'code')) {
        writeFileContents(id, code);
      }

      return code;
    },
  };
};
