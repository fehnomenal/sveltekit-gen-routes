// src/plugin/index.ts
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {basename as basename2, dirname as dirname3, join as join2, relative as relative3, resolve as resolve2} from "node:path";

// package.json
var name = "@fehnomenal/sveltekit-gen-routes";

// src/plugin/utils.ts
import {EOL} from "node:os";
import {isAbsolute, relative, sep} from "node:path";
import {normalizePath} from "vite";
var sortRoutes = (routes) => [
  routes.filter((r) => r.type === "PAGE"),
  routes.filter((r) => r.type === "SERVER"),
  routes.filter((r) => r.type === "ACTION")
].map((routes2) => routes2.sort((a, b) => a.key.localeCompare(b.key))).flat();
var normalizeUrl = (routeId) => routeId.replaceAll(/\([^/]+?\)/g, "").replaceAll(/\/{2,}/g, "/");
var baseUrlString = (baseName, url) => `\${${baseName}}${url.endsWith("/") && url !== "/" ? url.slice(0, -1) : url}`;
var isDebug = (debugConfig, key) => {
  if (typeof debugConfig === "boolean") {
    return debugConfig;
  }
  return debugConfig?.[key] ?? false;
};
var joinLines = (lines) => lines.join(EOL).trim() + EOL;
var makeRelativePath = (from, to) => {
  const rel = relative(from, to);
  return rel.startsWith(".") ? rel : `.${sep}${rel}`;
};
var isInSubdir = (parent, dir) => {
  const rel = relative(parent, dir);
  return rel.length > 0 && !rel.startsWith("..") && !isAbsolute(rel);
};
var replacePathParams = (url, pathParams, replaceValue) => {
  for (const param of pathParams) {
    const searchValue = param.multi ? `/${param.rawInRoute}` : param.rawInRoute;
    url = url.replace(searchValue, replaceValue(param));
  }
  return url;
};
var getServerRouteKeys = (route) => route.methods.map((method) => ({ key: `${route.key}_${method}`, method }));
var getActionRouteKeys = (route) => route.names.map((name2) => ({ key: `${route.key}_${name2}`, name: name2 }));

// src/plugin/generate.ts
function* generateRoutes(routes, config, generateRouteWithoutParameters, generateRouteWithParameters) {
  for (const route of flattenRoutes(routes, config)) {
    const maybeStop = yield* generateRoute(route, generateRouteWithoutParameters, generateRouteWithParameters);
    yield "";
    if (maybeStop === "stop") {
      break;
    }
  }
}
function* generateRoute(route, generateRouteWithoutParameters, generateRouteWithParameters) {
  let { identifier, key, baseUrl, urlSuffix, pathParams, queryParams } = route;
  if (pathParams.length + queryParams.length === 0) {
    return yield* generateRouteWithoutParameters({
      identifier,
      key,
      baseUrl,
      urlSuffix
    });
  }
  return yield* generateRouteWithParameters({
    identifier,
    key,
    baseUrl,
    urlSuffix,
    pathParams,
    queryParams
  });
}
var flattenRoutes = (routes, config) => {
  const finalRoutes = [];
  for (const route of sortRoutes(routes)) {
    if (route.type === "PAGE") {
      finalRoutes.push({
        identifier: `${route.type}_${route.key}`,
        key: route.key,
        baseUrl: normalizeUrl(route.routeId),
        pathParams: route.pathParams,
        queryParams: Object.entries(config.PAGES?.[route.key]?.explicitQueryParams ?? {})
      });
    } else if (route.type === "SERVER" && route.methods.length > 0) {
      finalRoutes.push(...expandServerRoute(route, config.SERVERS));
    } else if (route.type === "ACTION" && route.names.length > 0) {
      finalRoutes.push(...expandActionRoute(route, config.ACTIONS));
    }
  }
  return finalRoutes;
};
var expandServerRoute = (route, config) => getServerRouteKeys(route).map(({ key }) => ({
  identifier: `${route.type}_${key}`,
  key: route.key,
  baseUrl: normalizeUrl(route.routeId),
  pathParams: route.pathParams,
  queryParams: Object.entries(config?.[key]?.explicitQueryParams ?? [])
}));
var expandActionRoute = (route, config) => getActionRouteKeys(route).map(({ key, name: name2 }) => ({
  identifier: `${route.type}_${key}`,
  key: route.key,
  baseUrl: normalizeUrl(route.routeId),
  urlSuffix: name2 === "default" ? undefined : `?/${name2}`,
  pathParams: route.pathParams,
  queryParams: Object.entries(config?.[key]?.explicitQueryParams ?? [])
}));

// src/plugin/code.ts
function* generateCodeForBaseRouteWithoutParams(url, requiredImports) {
  requiredImports && (requiredImports.base = true);
  yield `const route = \`${baseUrlString("base", url)}\`;`;
}
function* generateCodeForBaseRouteWithParams(url, pathParams, queryParams, requiredImports) {
  if (pathParams.length === 0) {
    yield* generateCodeForBaseRouteWithoutParams(url, requiredImports);
  } else {
    url = replacePathParams(url, pathParams, (param) => {
      if (!param.multi) {
        return `\${${param.name}}`;
      }
      let needSlashFallback = pathParams.length === 1;
      if (needSlashFallback) {
        const u = new URL(url, "http://localhost");
        const segments = u.pathname.split("/").filter(Boolean);
        needSlashFallback = segments.indexOf(param.rawInRoute) === segments.length - 1;
      }
      requiredImports?.helperNames.add("joinSegments");
      return `\${${"joinSegments"}(${param.name})${needSlashFallback ? ` || '/'` : ""}}`;
    });
    const parts = [`const route = (`];
    parts.push(pathParams.map((p) => p.name).join(", "));
    requiredImports && (requiredImports.base = true);
    parts.push(") => `");
    parts.push(baseUrlString("base", url));
    parts.push("`;");
    yield parts.join("");
  }
}
function* generateCodeForRouteWithoutParams(baseUrl, urlSuffix, routeIdentifier, requiredImports) {
  let route = "route";
  const url = baseUrl + (urlSuffix ?? "");
  if (urlSuffix) {
    route = `route_${routeIdentifier}`;
    yield `const ${route} = \`\${route}${urlSuffix}\`;`;
  }
  requiredImports?.helperNames.add("routeQuery");
  yield `export const ${routeIdentifier} = ${route};`;
  yield `export const ${routeIdentifier}_query = ${buildRouteQuery(route, url)};`;
}
function* generateCodeForRouteWithParams(baseUrl, urlSuffix, routeIdentifier, pathParams, queryParams, requiredImports) {
  let route;
  const url = baseUrl + (urlSuffix ?? "");
  if (pathParams.length === 0) {
    route = "route";
  } else {
    route = `route(${pathParams.map((p) => p.name).join(", ")})`;
  }
  if (urlSuffix) {
    route = `\`\${${route}}${urlSuffix}\``;
  }
  const parts = [`export const ${routeIdentifier} = (`];
  const pathParamNames = pathParams.map((p) => p.name);
  const queryParamNames = queryParams.map(([name2]) => name2);
  const paramNames = [...pathParamNames, ...queryParamNames];
  if (pathParams.length + queryParams.length === 1) {
    const [paramName] = paramNames;
    parts.push(paramName);
  } else {
    parts.push("{ ");
    parts.push(paramNames.join(", "));
    parts.push(" }");
    const anyRequired = !pathParams.every((p) => p.multi) || queryParams.some(([, p]) => p.required);
    if (!anyRequired) {
      parts.push(" = {}");
    }
  }
  parts.push(`, ${EXTRA_QUERY_PARAM_NAME}) => `);
  if (queryParams.length === 0) {
    requiredImports?.helperNames.add("routeQueryParam");
    parts.push(buildRouteQueryParam(route, url));
  } else {
    requiredImports?.helperNames.add("routeQueryExtra");
    parts.push(buildRouteQueryExtra(route, url, queryParamNames));
  }
  parts.push(";");
  yield parts.join("");
}
var getIndexCodeLines = (routes, config, moduleName) => [
  ...generateRoutes(routes, config, function* ({ identifier, key }) {
    yield `export { ${identifier}, ${identifier}_query } from './${moduleName}/${key}.js';`;
  }, function* ({ identifier, key }) {
    yield `export { ${identifier} } from './${moduleName}/${key}.js';`;
  })
];
var helpersModule = `${name}/helpers`;
var getRouteKeyCodeLines = (routes, config) => {
  const requiredImports = {
    base: false,
    helperNames: new Set
  };
  const codeLines = [
    ...genBaseRoute(routes, config, requiredImports),
    ...routesCode(routes, config, requiredImports)
  ];
  const header = [];
  if (requiredImports.base) {
    header.push(`import { base } from '\$app/paths';`);
  }
  if (requiredImports.helperNames.size > 0) {
    header.push(`import { ${[...requiredImports.helperNames].sort().join(", ")} } from '${helpersModule}';`);
  }
  if (header.length > 0) {
    codeLines.unshift(...header, "");
  }
  return codeLines;
};
var genBaseRoute = (routes, config, requiredImports) => generateRoutes(routes, config, function* ({ baseUrl }) {
  yield* generateCodeForBaseRouteWithoutParams(baseUrl, requiredImports);
  return "stop";
}, function* ({ baseUrl, pathParams, queryParams }) {
  yield* generateCodeForBaseRouteWithParams(baseUrl, pathParams, queryParams, requiredImports);
  return "stop";
});
var routesCode = (routes, config, requiredImports) => generateRoutes(routes, config, function* ({ identifier, baseUrl, urlSuffix }) {
  yield* generateCodeForRouteWithoutParams(baseUrl, urlSuffix, identifier, requiredImports);
}, function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
  yield* generateCodeForRouteWithParams(baseUrl, urlSuffix, identifier, pathParams, queryParams, requiredImports);
});
var EXTRA_QUERY_PARAM_NAME = "q";
var buildRouteQuery = (route, url) => routeCall("routeQuery", route, querySepCharArg(url));
var buildRouteQueryParam = (route, url) => routeCall("routeQueryParam", route, EXTRA_QUERY_PARAM_NAME, querySepCharArg(url));
var buildRouteQueryExtra = (route, url, explicitQueryParamNames) => routeCall("routeQueryExtra", route, EXTRA_QUERY_PARAM_NAME, `{ ${explicitQueryParamNames.join(", ")} }`, querySepCharArg(url));
var routeCall = (fnName, url, ...args) => `${fnName}(${[url, ...args.filter(Boolean)].join(", ")})`;
var querySepCharArg = (url) => url.includes("?") ? `'&'` : undefined;

// src/plugin/declaration.ts
import {dirname, relative as relative2} from "node:path";
import {normalizePath as normalizePath2} from "vite";
function* preludeDecls(declarationFilePath, paramMatchersDir, routes) {
  yield `import type { Base, ParamOfMatcher, QueryParams } from '${name}/types';`;
  yield "";
  const matchers = routes.flatMap((route) => route.pathParams.flatMap((p) => p.matcher ? [p.matcher] : [])).sort().filter((m, idx, arr) => arr.indexOf(m) === idx);
  const paramMatcherModulePrefix = normalizePath2(relative2(dirname(declarationFilePath), paramMatchersDir));
  for (const matcher of matchers) {
    yield `type Param_${matcher} = ParamOfMatcher<typeof import('./${paramMatcherModulePrefix}/${matcher}.js').match>;`;
  }
  if (matchers.length > 0) {
    yield "";
  }
}
function* generateDeclsForRouteWithoutParams(url, routeIdentifier) {
  yield `export const ${routeIdentifier}: \`${baseUrlString("Base", url)}\`;`;
  yield `export function ${routeIdentifier}_query(`;
  yield `  queryParams: QueryParams,`;
  yield `): \`${baseUrlString("Base", url)}\${string /* queryParams */}\`;`;
}
function* generateDeclsForRouteWithParams(url, routeIdentifier, pathParams, queryParams) {
  url = replacePathParams(url, pathParams, (param) => param.multi ? `\${string /* ${pathParams.length + queryParams.length > 1 ? "params." : ""}${param.name} */}` : `\${typeof ${pathParams.length + queryParams.length > 1 ? "params." : ""}${param.name}}`);
  const pathParamsStringified = pathParams.map((p) => paramToString(p.name, p.multi, p.type));
  const queryParamsStringified = queryParams.map(([name2, p]) => paramToString(name2, !p.required, p.type));
  const paramsStringified = [...pathParamsStringified, ...queryParamsStringified];
  yield `export function ${routeIdentifier}(`;
  if (pathParams.length + queryParams.length === 1) {
    const [param] = paramsStringified;
    yield `  ${param},`;
  } else {
    const allOptional = pathParams.every((p) => p.multi) && queryParams.every(([, p]) => !p.required);
    if (allOptional) {
      yield `  params?: {`;
    } else {
      yield `  params: {`;
    }
    for (const param of paramsStringified) {
      yield `    ${param},`;
    }
    yield `  },`;
  }
  yield `  queryParams?: QueryParams,`;
  yield `): \`${baseUrlString("Base", url)}\${string /* queryParams */}\`;`;
}
function* routesMeta(routes) {
  const meta = {
    PAGE: {},
    SERVER: {},
    ACTION: {}
  };
  for (const route of routes) {
    let keyHolders;
    if (route.type === "PAGE") {
      keyHolders = [{ key: route.key }];
    } else if (route.type === "SERVER") {
      keyHolders = getServerRouteKeys(route);
    } else if (route.type === "ACTION") {
      keyHolders = getActionRouteKeys(route);
    } else {
      continue;
    }
    for (const { key } of keyHolders) {
      meta[route.type][key] = route.pathParams.length === 0 ? "never" : route.pathParams.map((p) => `'${p.name}'`).join(" | ");
    }
  }
  yield `export type ROUTES = {`;
  for (const [type, routes2] of Object.entries(meta)) {
    if (Object.keys(routes2).length === 0) {
      continue;
    }
    yield `  ${type}S: {`;
    for (const [route, pathParams] of Object.entries(routes2).sort((a, b) => a[0].localeCompare(b[0]))) {
      yield `    ${route}: ${pathParams};`;
    }
    yield `  };`;
  }
  yield `};`;
}
var getDeclarationFileContentLines = (moduleName, declarationFilePath, paramMatchersDir, routes, config) => [
  `/* eslint-disable */`,
  `// prettier-ignore`,
  `declare module '${moduleName}' {`,
  ...[
    ...preludeDecls(declarationFilePath, paramMatchersDir, routes),
    ...routeDecls(routes, config),
    ...routesMeta(routes),
    "",
    `export {};`
  ].map((l) => `  ${l}`.trimEnd()),
  `}`
];
var routeDecls = (routes, config) => generateRoutes(routes, config, function* ({ identifier, baseUrl, urlSuffix }) {
  const url = baseUrl + (urlSuffix ?? "");
  yield* generateDeclsForRouteWithoutParams(url, identifier);
}, function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
  const url = baseUrl + (urlSuffix ?? "");
  yield* generateDeclsForRouteWithParams(url, identifier, pathParams, queryParams);
});
var paramToString = (name2, optional, type) => [name2, optional && "?", ": ", type].filter(Boolean).join("");

// src/plugin/readdir.ts
import {readdirSync} from "node:fs";
import {join, resolve} from "node:path";
function* getRelativeFilesOfDir(dir, prefix = "") {
  const dirents = readdirSync(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const relative3 = join(prefix, dirent.name);
    if (dirent.isDirectory()) {
      yield* getRelativeFilesOfDir(resolve(dir, dirent.name), relative3);
    } else {
      yield relative3;
    }
  }
}

// src/plugin/resolve.ts
import slugify2 from "@sindresorhus/slugify";
import {basename, dirname as dirname2} from "node:path";
import ts from "typescript";
import {normalizePath as normalizePath3} from "vite";
var serverScriptPattern = /^\+server\.(js|ts)$/;
var pageComponentPattern = /^\+page(@.*?)?\.svelte$/;
var pageScriptPattern = /^\+page\.(js|ts)$/;
var pageServerScriptPattern = /^\+page\.server\.(js|ts)$/;
var getRouteId = (routesDirRelativePath) => normalizePath3(dirname2(`/${routesDirRelativePath}`));
var getRouteKey = (routeId) => routeId === "/" ? "_ROOT" : slugify2(routeId, { separator: "_" });
var makeValidIdentifier = (name2) => {
  if (/^[0-9-]/.test(name2)) {
    return `_${name2}`;
  }
  return name2;
};
var getRoutePathParams = (routeId) => {
  if (/\[\[.+\]\]/.test(routeId)) {
    throw new Error("Optional path parameters are not supported yet!");
  }
  const pathParams = [];
  for (let [rawInRoute, param, matcher] of routeId.matchAll(/\[(.+?)(?:=(.+?))?\]/g)) {
    if (!param) {
      continue;
    }
    let type = "string";
    let multi = false;
    if (param.startsWith("...")) {
      param = param.slice(3);
      type = "string | string[]";
      multi = true;
    } else if (matcher) {
      type = `Param_${matcher}`;
    }
    pathParams.push({
      name: makeValidIdentifier(param),
      type,
      rawInRoute,
      matcher,
      multi
    });
  }
  return pathParams;
};
var getFileTypeFromFileName = (fileName) => {
  fileName = basename(fileName);
  if (serverScriptPattern.test(fileName)) {
    return "SERVER_SCRIPT";
  }
  if (pageComponentPattern.test(fileName)) {
    return "PAGE_COMPONENT";
  }
  if (pageScriptPattern.test(fileName)) {
    return "PAGE_SCRIPT";
  }
  if (pageServerScriptPattern.test(fileName)) {
    return "PAGE_SERVER_SCRIPT";
  }
  return null;
};
var getRouteTypeFromFileType = (fileType) => {
  if (fileType === "SERVER_SCRIPT") {
    return "SERVER";
  }
  if (fileType === "PAGE_COMPONENT" || fileType === "PAGE_SCRIPT") {
    return "PAGE";
  }
  if (fileType === "PAGE_SERVER_SCRIPT") {
    return "ACTION";
  }
  throw new Error(`Unexpected route type: '${fileType}'`);
};
var resolveRouteInfo = (routeId, fileType, getSource, routes) => {
  const key = getRouteKey(routeId);
  const pathParams = getRoutePathParams(routeId);
  const type = getRouteTypeFromFileType(fileType);
  function getExisting(type2) {
    return routes.find((r) => r.type === type2 && r.routeId === routeId);
  }
  if (type === "SERVER") {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams,
        methods: []
      };
      routes.push(route);
    }
    route.methods = extractMethodsFromServerEndpointCode(getSource()).sort();
    return;
  }
  if (type === "PAGE") {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams
      };
      routes.push(route);
    }
    return;
  }
  if (type === "ACTION") {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams,
        names: []
      };
      routes.push(route);
    }
    route.names = extractActionNamesFromPageServerCode(getSource()).sort();
    return;
  }
  throw new Error(`Unexpected route type: '${type}'`);
};
var extractMethodsFromServerEndpointCode = (code) => {
  const source = ts.createSourceFile("x.ts", code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const methods = [];
  findExports(source, (name2) => {
    if (name2.toUpperCase() === name2) {
      methods.push(name2);
    }
  });
  return methods;
};
var extractActionNamesFromPageServerCode = (code) => {
  const source = ts.createSourceFile("x.ts", code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
  const names = [];
  findExports(source, (name2, node) => {
    if (name2 === "actions") {
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isObjectLiteralExpression(node.initializer)) {
          node.initializer.properties.forEach((prop) => {
            if (ts.isMethodDeclaration(prop)) {
              names.push(prop.name.text);
            } else if (ts.isPropertyAssignment(prop)) {
              names.push(prop.name.text);
            } else {
              throw new Error(`Unhandled action property kind: ${ts.SyntaxKind[prop.kind]}`);
            }
          });
        }
      } else {
        throw new Error(`Unhandled action kind: ${ts.SyntaxKind[node.kind]}`);
      }
    }
  });
  return names;
};
var findExports = (node, handleExport) => {
  node.forEachChild((node2) => {
    if (ts.isVariableStatement(node2)) {
      if (node2.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node2.declarationList.declarations.forEach((decl) => handleExport(decl.name.text, decl));
      }
    } else if (ts.isExportDeclaration(node2)) {
      if (node2.exportClause && ts.isNamedExports(node2.exportClause)) {
        node2.exportClause.elements.forEach((spec) => handleExport(spec.name.text, spec));
      }
    }
    node2.forEachChild((node3) => findExports(node3, handleExport));
  });
};

// src/plugin/index.ts
var sveltekitRoutes = ({
  moduleName = "$routes",
  routesDir = join2(".", "src", "routes"),
  paramMatchersDir = join2(".", "src", "params"),
  outputDir = join2(".", "src"),
  forceRootRoute = true,
  debug,
  ...routesConfig
} = {}) => {
  const routes = [];
  routesDir = resolve2(routesDir);
  paramMatchersDir = resolve2(paramMatchersDir);
  outputDir = resolve2(outputDir);
  const declarationFilePath = resolve2(outputDir, `${moduleName}.d.ts`);
  const relativeOutputDir = makeRelativePath(".", outputDir);
  const routeIndexModuleId = makeRelativePath(".", resolve2(outputDir, `${moduleName}.js`));
  const routeModuleIdPrefix = resolve2(outputDir, moduleName);
  let isDev = false;
  let latestUpdate = 0;
  const writeFileContents = (file, contents) => {
    if (Array.isArray(contents)) {
      contents = joinLines(contents);
    }
    if (existsSync(file)) {
      const oldContents = readFileSync(file, { encoding: "utf-8" });
      if (oldContents === contents) {
        return;
      }
    }
    mkdirSync(dirname3(file), { recursive: true });
    writeFileSync(file, contents, { encoding: "utf-8" });
  };
  const resolveAllRoutes = () => {
    for (const file of getRelativeFilesOfDir(routesDir)) {
      const routeId = getRouteId(file);
      const fileType = getFileTypeFromFileName(file);
      if (fileType) {
        resolveRouteInfo(routeId, fileType, () => readFileSync(resolve2(routesDir, file), { encoding: "utf-8" }), routes);
      }
    }
    if (forceRootRoute) {
      resolveRouteInfo("/", "PAGE_COMPONENT", () => "", routes);
    }
  };
  const handleUpdatedRoutes = () => {
    latestUpdate = Date.now();
    const lines = getDeclarationFileContentLines(moduleName, declarationFilePath, paramMatchersDir, routes, routesConfig);
    writeFileContents(declarationFilePath, lines);
  };
  return {
    name,
    config(_config, env) {
      isDev = env.command === "serve";
    },
    async watchChange(id, change) {
      if (!isInSubdir(routesDir, id)) {
        return;
      }
      const fileType = getFileTypeFromFileName(id);
      if (fileType) {
        const routeId = getRouteId(relative3(routesDir, id));
        if (change.event === "delete") {
          if (fileType === "PAGE_COMPONENT" || fileType === "PAGE_SCRIPT") {
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
          resolveRouteInfo(routeId, fileType, () => readFileSync(id, { encoding: "utf-8" }), routes);
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
        return;
      }
      let outputId;
      if (id === moduleName) {
        outputId = routeIndexModuleId;
      } else if (id.startsWith(`./${moduleName}/`) && id.endsWith(".js")) {
        outputId = join2(relativeOutputDir, id);
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
        return;
      }
      if (isDev) {
        const searchIdx = id.indexOf("?");
        if (searchIdx > -1) {
          id = id.slice(0, searchIdx);
        }
      }
      id = makeRelativePath(".", id);
      let codeLines;
      if (id === routeIndexModuleId) {
        codeLines = getIndexCodeLines(routes, routesConfig, moduleName);
      } else if (isInSubdir(routeModuleIdPrefix, id) && id.endsWith(".js")) {
        const routeKey = basename2(id, ".js");
        const filteredRoutes = routes.filter((r) => r.key === routeKey);
        codeLines = getRouteKeyCodeLines(filteredRoutes, routesConfig);
      } else {
        return;
      }
      const code2 = joinLines(codeLines);
      if (isDebug(debug, "code")) {
        writeFileContents(id, code2);
      }
      return code2;
    }
  };
};
export {
  sveltekitRoutes
};
