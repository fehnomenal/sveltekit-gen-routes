import debounce from 'just-debounce';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { getIndexCodeLines, getRouteKeyCodeLines, helperCodeLines } from './code.js';
import { getDeclarationFileContentLines } from './declaration.js';
import { getFilesOfDir } from './readdir.js';
import { getRouteId, isPageFile, isServerEndpointFile, resolveRouteInfo } from './resolve.js';
import type { AllRoutesMeta, Config, Route } from './types.js';
import { isDebug, joinLines } from './utils.js';

const MODULE_ID = '\0sveltekit_routes';

export const sveltekitRoutes = <Meta extends AllRoutesMeta = AllRoutesMeta>({
  moduleName = '$routes',
  routesDir = './src/routes',
  paramMatchersDir = './src/params',
  outputDir = './src',

  debug,
  ...routesConfig
}: Config<Meta> = {}): Plugin => {
  let routes: Route[] = [
    {
      type: 'PAGE',
      key: '_ROOT',
      routeId: '',
      pathParams: [],
    },
  ];

  routesDir = resolve(routesDir);
  paramMatchersDir = resolve(paramMatchersDir);
  outputDir = resolve(outputDir);

  const writeDeclarationFile = (lines: string[]) =>
    writeFileSync(resolve(outputDir, `${moduleName}.d.ts`), joinLines(lines));
  const writeDeclarationFileDebounced = debounce(writeDeclarationFile, 100);

  let isDev = false;
  let latestUpdate = 0;

  return {
    name: '@fehnomenal/sveltekit-gen-routes',

    config(_config, env) {
      isDev = env.command === 'serve';
    },

    async watchChange(id, change) {
      if (!id.startsWith(routesDir)) {
        return;
      }

      if (change.event === 'delete') {
        const routeId = getRouteId(routesDir, id);

        routes = routes.filter((r) => r.routeId !== routeId);
      } else {
        resolveRouteInfo(routesDir, id, routes);
      }

      latestUpdate = Date.now();

      const lines = getDeclarationFileContentLines(
        moduleName,
        outputDir,
        paramMatchersDir,
        routes,
        routesConfig,
      );
      writeDeclarationFileDebounced(lines);
    },

    async buildStart() {
      for await (const file of getFilesOfDir(routesDir)) {
        if (!isServerEndpointFile(file) && !isPageFile(file)) {
          continue;
        }

        const id = await this.resolve(file, undefined, { skipSelf: true });

        if (!id || !id.id.startsWith(routesDir)) {
          continue;
        }

        resolveRouteInfo(routesDir, id.id, routes);
      }

      latestUpdate = Date.now();

      const lines = getDeclarationFileContentLines(
        moduleName,
        outputDir,
        paramMatchersDir,
        routes,
        routesConfig,
      );
      writeDeclarationFile(lines);
    },

    resolveId(id) {
      if (id.startsWith(moduleName)) {
        id = MODULE_ID + id.slice(moduleName.length);

        if (isDev) {
          id += `?${latestUpdate}`;
        }

        return { id, moduleSideEffects: false };
      }
    },

    load(id) {
      if (id.startsWith(MODULE_ID)) {
        const searchIdx = id.indexOf('?');
        if (searchIdx > -1) {
          id = id.slice(0, searchIdx);
        }
        id = id.slice(MODULE_ID.length);

        let codeLines: string[];

        if (id === '/helpers') {
          codeLines = helperCodeLines;
        } else if (id === '') {
          codeLines = getIndexCodeLines(routes, routesConfig, moduleName);
        } else {
          const key = id.slice(1);
          const filteredRoutes = routes.filter((r) => r.key === key);

          codeLines = getRouteKeyCodeLines(filteredRoutes, routesConfig, moduleName);
        }

        const code = joinLines(codeLines);

        if (isDebug(debug, 'code')) {
          const outputFile = resolve(outputDir, `${moduleName}${id}.js`);

          mkdirSync(dirname(outputFile), { recursive: true });

          writeFileSync(
            outputFile,
            code
              .replace(`'${moduleName}/helpers'`, `'./helpers.js'`)
              .replaceAll(
                new RegExp(`'${moduleName.replace('$', '\\$')}(/.*?)'`, 'g'),
                `'./${moduleName}$1.js'`,
              ),
          );
        }

        return code;
      }
    },
  };
};
