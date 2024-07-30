import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { type Plugin } from 'vite';
import { name } from '../../package.json';
import { getIndexCodeLines, getRouteKeyCodeLines } from './code.js';
import { getDeclarationFileContentLines } from './declaration.js';
import { getRelativeFilesOfDir } from './readdir.js';
import { getRouteId, getRouteTypeFromFileName, resolveRouteInfo } from './resolve.js';
import type { AllRoutesMeta, Config, Route } from './types.js';
import { isDebug, isInSubdir, joinLines, makeRelativePath } from './utils.js';

export const sveltekitRoutes = <Meta extends AllRoutesMeta = AllRoutesMeta>({
  moduleName = '$routes',
  routesDir = join('.', 'src', 'routes'),
  paramMatchersDir = join('.', 'src', 'params'),
  outputDir = join('.', 'src'),

  debug,
  ...routesConfig
}: Config<Meta> = {}): Plugin => {
  let routes: Route[] = [];

  routesDir = resolve(routesDir);
  paramMatchersDir = resolve(paramMatchersDir);
  outputDir = resolve(outputDir);

  const declarationFilePath = resolve(outputDir, `${moduleName}.d.ts`);

  const relativeOutputDir = makeRelativePath('.', outputDir);
  const routeIndexModuleId = makeRelativePath('.', resolve(outputDir, `${moduleName}.js`));
  const routeModuleIdPrefix = resolve(outputDir, moduleName);

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

  let isDev = false;
  let latestUpdate = 0;

  return {
    name,

    config(_config, env) {
      isDev = env.command === 'serve';
    },

    async watchChange(id, change) {
      if (!isInSubdir(routesDir, id)) {
        return;
      }

      const routeId = getRouteId(relative(routesDir, id));

      if (change.event === 'delete') {
        routes = routes.filter((r) => r.routeId !== routeId);
      } else {
        const routeType = getRouteTypeFromFileName(id);
        if (routeType) {
          resolveRouteInfo(routeId, routeType, () => readFileSync(id, { encoding: 'utf-8' }), routes);
        }
      }

      latestUpdate = Date.now();

      const lines = getDeclarationFileContentLines(
        moduleName,
        declarationFilePath,
        paramMatchersDir,
        routes,
        routesConfig,
      );
      writeFileContents(declarationFilePath, lines);
    },

    async buildStart() {
      for (const file of getRelativeFilesOfDir(routesDir)) {
        const routeId = getRouteId(file);

        const routeType = getRouteTypeFromFileName(file);
        if (routeType) {
          resolveRouteInfo(
            routeId,
            routeType,
            () => readFileSync(resolve(routesDir, file), { encoding: 'utf-8' }),
            routes,
          );
        }
      }

      latestUpdate = Date.now();

      const lines = getDeclarationFileContentLines(
        moduleName,
        declarationFilePath,
        paramMatchersDir,
        routes,
        routesConfig,
      );
      writeFileContents(declarationFilePath, lines);
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
