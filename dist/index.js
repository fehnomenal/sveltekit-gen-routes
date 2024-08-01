// src/plugin/index.ts
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {basename as basename2, dirname as dirname3, join as join2, relative as relative3, resolve as resolve2} from "node:path";

// package.json
var name = "@fehnomenal/sveltekit-gen-routes";

// src/plugin/utils.ts
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
var joinLines = (lines) => lines.join("\n").trim() + "\n";
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
function* generateCodeForBaseRouteWithoutParams(url) {
  yield `const route = \`${baseUrlString("base", url)}\`;`;
}
function* generateCodeForBaseRouteWithParams(url, pathParams, queryParams) {
  if (pathParams.length === 0) {
    yield* generateCodeForBaseRouteWithoutParams(url);
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
      return `\${${"joinSegments"}(${param.name})${needSlashFallback ? ` || '/'` : ""}}`;
    });
    const parts = [`const route = (`];
    parts.push(pathParams.map((p) => p.name).join(", "));
    parts.push(") => `");
    parts.push(baseUrlString("base", url));
    parts.push("`;");
    yield parts.join("");
  }
}
function* generateCodeForRouteWithoutParams(baseUrl, urlSuffix, routeIdentifier) {
  let route = "route";
  const url = baseUrl + (urlSuffix ?? "");
  if (urlSuffix) {
    route = `route_${routeIdentifier}`;
    yield `const ${route} = \`\${route}${urlSuffix}\`;`;
  }
  yield `export const ${routeIdentifier} = ${route};`;
  yield `export const ${routeIdentifier}_query = ${buildRouteQuery(route, url)};`;
}
function* generateCodeForRouteWithParams(baseUrl, urlSuffix, routeIdentifier, pathParams, queryParams) {
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
    parts.push(buildRouteQueryParam(route, url));
  } else {
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
var getRouteKeyCodeLines = (routes, config) => [
  `import { base } from '\$app/paths';`,
  `import { ${"joinSegments"}, ${"routeQuery"}, ${"routeQueryParam"}, ${"routeQueryExtra"} } from '${helpersModule}';`,
  "",
  ...genBaseRoute(routes, config),
  ...routesCode(routes, config)
];
var genBaseRoute = (routes, config) => generateRoutes(routes, config, function* ({ baseUrl }) {
  yield* generateCodeForBaseRouteWithoutParams(baseUrl);
  return "stop";
}, function* ({ baseUrl, pathParams, queryParams }) {
  yield* generateCodeForBaseRouteWithParams(baseUrl, pathParams, queryParams);
  return "stop";
});
var routesCode = (routes, config) => generateRoutes(routes, config, function* ({ identifier, baseUrl, urlSuffix }) {
  yield* generateCodeForRouteWithoutParams(baseUrl, urlSuffix, identifier);
}, function* ({ identifier, baseUrl, urlSuffix, pathParams, queryParams }) {
  yield* generateCodeForRouteWithParams(baseUrl, urlSuffix, identifier, pathParams, queryParams);
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

// node_modules/escape-string-regexp/index.js
function escapeStringRegexp(string) {
  if (typeof string !== "string") {
    throw new TypeError("Expected a string");
  }
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

// node_modules/@sindresorhus/transliterate/replacements.js
var replacements = [
  ["\xDF", "ss"],
  ["\u1E9E", "Ss"],
  ["\xE4", "ae"],
  ["\xC4", "Ae"],
  ["\xF6", "oe"],
  ["\xD6", "Oe"],
  ["\xFC", "ue"],
  ["\xDC", "Ue"],
  ["\xC0", "A"],
  ["\xC1", "A"],
  ["\xC2", "A"],
  ["\xC3", "A"],
  ["\xC4", "Ae"],
  ["\xC5", "A"],
  ["\xC6", "AE"],
  ["\xC7", "C"],
  ["\xC8", "E"],
  ["\xC9", "E"],
  ["\xCA", "E"],
  ["\xCB", "E"],
  ["\xCC", "I"],
  ["\xCD", "I"],
  ["\xCE", "I"],
  ["\xCF", "I"],
  ["\xD0", "D"],
  ["\xD1", "N"],
  ["\xD2", "O"],
  ["\xD3", "O"],
  ["\xD4", "O"],
  ["\xD5", "O"],
  ["\xD6", "Oe"],
  ["\u0150", "O"],
  ["\xD8", "O"],
  ["\xD9", "U"],
  ["\xDA", "U"],
  ["\xDB", "U"],
  ["\xDC", "Ue"],
  ["\u0170", "U"],
  ["\xDD", "Y"],
  ["\xDE", "TH"],
  ["\xDF", "ss"],
  ["\xE0", "a"],
  ["\xE1", "a"],
  ["\xE2", "a"],
  ["\xE3", "a"],
  ["\xE4", "ae"],
  ["\xE5", "a"],
  ["\xE6", "ae"],
  ["\xE7", "c"],
  ["\xE8", "e"],
  ["\xE9", "e"],
  ["\xEA", "e"],
  ["\xEB", "e"],
  ["\xEC", "i"],
  ["\xED", "i"],
  ["\xEE", "i"],
  ["\xEF", "i"],
  ["\xF0", "d"],
  ["\xF1", "n"],
  ["\xF2", "o"],
  ["\xF3", "o"],
  ["\xF4", "o"],
  ["\xF5", "o"],
  ["\xF6", "oe"],
  ["\u0151", "o"],
  ["\xF8", "o"],
  ["\xF9", "u"],
  ["\xFA", "u"],
  ["\xFB", "u"],
  ["\xFC", "ue"],
  ["\u0171", "u"],
  ["\xFD", "y"],
  ["\xFE", "th"],
  ["\xFF", "y"],
  ["\u1E9E", "SS"],
  ["\xE0", "a"],
  ["\xC0", "A"],
  ["\xE1", "a"],
  ["\xC1", "A"],
  ["\xE2", "a"],
  ["\xC2", "A"],
  ["\xE3", "a"],
  ["\xC3", "A"],
  ["\xE8", "e"],
  ["\xC8", "E"],
  ["\xE9", "e"],
  ["\xC9", "E"],
  ["\xEA", "e"],
  ["\xCA", "E"],
  ["\xEC", "i"],
  ["\xCC", "I"],
  ["\xED", "i"],
  ["\xCD", "I"],
  ["\xF2", "o"],
  ["\xD2", "O"],
  ["\xF3", "o"],
  ["\xD3", "O"],
  ["\xF4", "o"],
  ["\xD4", "O"],
  ["\xF5", "o"],
  ["\xD5", "O"],
  ["\xF9", "u"],
  ["\xD9", "U"],
  ["\xFA", "u"],
  ["\xDA", "U"],
  ["\xFD", "y"],
  ["\xDD", "Y"],
  ["\u0103", "a"],
  ["\u0102", "A"],
  ["\u0110", "D"],
  ["\u0111", "d"],
  ["\u0129", "i"],
  ["\u0128", "I"],
  ["\u0169", "u"],
  ["\u0168", "U"],
  ["\u01A1", "o"],
  ["\u01A0", "O"],
  ["\u01B0", "u"],
  ["\u01AF", "U"],
  ["\u1EA1", "a"],
  ["\u1EA0", "A"],
  ["\u1EA3", "a"],
  ["\u1EA2", "A"],
  ["\u1EA5", "a"],
  ["\u1EA4", "A"],
  ["\u1EA7", "a"],
  ["\u1EA6", "A"],
  ["\u1EA9", "a"],
  ["\u1EA8", "A"],
  ["\u1EAB", "a"],
  ["\u1EAA", "A"],
  ["\u1EAD", "a"],
  ["\u1EAC", "A"],
  ["\u1EAF", "a"],
  ["\u1EAE", "A"],
  ["\u1EB1", "a"],
  ["\u1EB0", "A"],
  ["\u1EB3", "a"],
  ["\u1EB2", "A"],
  ["\u1EB5", "a"],
  ["\u1EB4", "A"],
  ["\u1EB7", "a"],
  ["\u1EB6", "A"],
  ["\u1EB9", "e"],
  ["\u1EB8", "E"],
  ["\u1EBB", "e"],
  ["\u1EBA", "E"],
  ["\u1EBD", "e"],
  ["\u1EBC", "E"],
  ["\u1EBF", "e"],
  ["\u1EBE", "E"],
  ["\u1EC1", "e"],
  ["\u1EC0", "E"],
  ["\u1EC3", "e"],
  ["\u1EC2", "E"],
  ["\u1EC5", "e"],
  ["\u1EC4", "E"],
  ["\u1EC7", "e"],
  ["\u1EC6", "E"],
  ["\u1EC9", "i"],
  ["\u1EC8", "I"],
  ["\u1ECB", "i"],
  ["\u1ECA", "I"],
  ["\u1ECD", "o"],
  ["\u1ECC", "O"],
  ["\u1ECF", "o"],
  ["\u1ECE", "O"],
  ["\u1ED1", "o"],
  ["\u1ED0", "O"],
  ["\u1ED3", "o"],
  ["\u1ED2", "O"],
  ["\u1ED5", "o"],
  ["\u1ED4", "O"],
  ["\u1ED7", "o"],
  ["\u1ED6", "O"],
  ["\u1ED9", "o"],
  ["\u1ED8", "O"],
  ["\u1EDB", "o"],
  ["\u1EDA", "O"],
  ["\u1EDD", "o"],
  ["\u1EDC", "O"],
  ["\u1EDF", "o"],
  ["\u1EDE", "O"],
  ["\u1EE1", "o"],
  ["\u1EE0", "O"],
  ["\u1EE3", "o"],
  ["\u1EE2", "O"],
  ["\u1EE5", "u"],
  ["\u1EE4", "U"],
  ["\u1EE7", "u"],
  ["\u1EE6", "U"],
  ["\u1EE9", "u"],
  ["\u1EE8", "U"],
  ["\u1EEB", "u"],
  ["\u1EEA", "U"],
  ["\u1EED", "u"],
  ["\u1EEC", "U"],
  ["\u1EEF", "u"],
  ["\u1EEE", "U"],
  ["\u1EF1", "u"],
  ["\u1EF0", "U"],
  ["\u1EF3", "y"],
  ["\u1EF2", "Y"],
  ["\u1EF5", "y"],
  ["\u1EF4", "Y"],
  ["\u1EF7", "y"],
  ["\u1EF6", "Y"],
  ["\u1EF9", "y"],
  ["\u1EF8", "Y"],
  ["\u0621", "e"],
  ["\u0622", "a"],
  ["\u0623", "a"],
  ["\u0624", "w"],
  ["\u0625", "i"],
  ["\u0626", "y"],
  ["\u0627", "a"],
  ["\u0628", "b"],
  ["\u0629", "t"],
  ["\u062A", "t"],
  ["\u062B", "th"],
  ["\u062C", "j"],
  ["\u062D", "h"],
  ["\u062E", "kh"],
  ["\u062F", "d"],
  ["\u0630", "dh"],
  ["\u0631", "r"],
  ["\u0632", "z"],
  ["\u0633", "s"],
  ["\u0634", "sh"],
  ["\u0635", "s"],
  ["\u0636", "d"],
  ["\u0637", "t"],
  ["\u0638", "z"],
  ["\u0639", "e"],
  ["\u063A", "gh"],
  ["\u0640", "_"],
  ["\u0641", "f"],
  ["\u0642", "q"],
  ["\u0643", "k"],
  ["\u0644", "l"],
  ["\u0645", "m"],
  ["\u0646", "n"],
  ["\u0647", "h"],
  ["\u0648", "w"],
  ["\u0649", "a"],
  ["\u064A", "y"],
  ["\u064E\u200E", "a"],
  ["\u064F", "u"],
  ["\u0650\u200E", "i"],
  ["\u0660", "0"],
  ["\u0661", "1"],
  ["\u0662", "2"],
  ["\u0663", "3"],
  ["\u0664", "4"],
  ["\u0665", "5"],
  ["\u0666", "6"],
  ["\u0667", "7"],
  ["\u0668", "8"],
  ["\u0669", "9"],
  ["\u0686", "ch"],
  ["\u06A9", "k"],
  ["\u06AF", "g"],
  ["\u067E", "p"],
  ["\u0698", "zh"],
  ["\u06CC", "y"],
  ["\u06F0", "0"],
  ["\u06F1", "1"],
  ["\u06F2", "2"],
  ["\u06F3", "3"],
  ["\u06F4", "4"],
  ["\u06F5", "5"],
  ["\u06F6", "6"],
  ["\u06F7", "7"],
  ["\u06F8", "8"],
  ["\u06F9", "9"],
  ["\u067C", "p"],
  ["\u0681", "z"],
  ["\u0685", "c"],
  ["\u0689", "d"],
  ["\uFEAB", "d"],
  ["\uFEAD", "r"],
  ["\u0693", "r"],
  ["\uFEAF", "z"],
  ["\u0696", "g"],
  ["\u069A", "x"],
  ["\u06AB", "g"],
  ["\u06BC", "n"],
  ["\u06C0", "e"],
  ["\u06D0", "e"],
  ["\u06CD", "ai"],
  ["\u0679", "t"],
  ["\u0688", "d"],
  ["\u0691", "r"],
  ["\u06BA", "n"],
  ["\u06C1", "h"],
  ["\u06BE", "h"],
  ["\u06D2", "e"],
  ["\u0410", "A"],
  ["\u0430", "a"],
  ["\u0411", "B"],
  ["\u0431", "b"],
  ["\u0412", "V"],
  ["\u0432", "v"],
  ["\u0413", "G"],
  ["\u0433", "g"],
  ["\u0414", "D"],
  ["\u0434", "d"],
  ["\u044A\u0435", "ye"],
  ["\u042A\u0435", "Ye"],
  ["\u044A\u0415", "yE"],
  ["\u042A\u0415", "YE"],
  ["\u0415", "E"],
  ["\u0435", "e"],
  ["\u0401", "Yo"],
  ["\u0451", "yo"],
  ["\u0416", "Zh"],
  ["\u0436", "zh"],
  ["\u0417", "Z"],
  ["\u0437", "z"],
  ["\u0418", "I"],
  ["\u0438", "i"],
  ["\u044B\u0439", "iy"],
  ["\u042B\u0439", "Iy"],
  ["\u042B\u0419", "IY"],
  ["\u044B\u0419", "iY"],
  ["\u0419", "Y"],
  ["\u0439", "y"],
  ["\u041A", "K"],
  ["\u043A", "k"],
  ["\u041B", "L"],
  ["\u043B", "l"],
  ["\u041C", "M"],
  ["\u043C", "m"],
  ["\u041D", "N"],
  ["\u043D", "n"],
  ["\u041E", "O"],
  ["\u043E", "o"],
  ["\u041F", "P"],
  ["\u043F", "p"],
  ["\u0420", "R"],
  ["\u0440", "r"],
  ["\u0421", "S"],
  ["\u0441", "s"],
  ["\u0422", "T"],
  ["\u0442", "t"],
  ["\u0423", "U"],
  ["\u0443", "u"],
  ["\u0424", "F"],
  ["\u0444", "f"],
  ["\u0425", "Kh"],
  ["\u0445", "kh"],
  ["\u0426", "Ts"],
  ["\u0446", "ts"],
  ["\u0427", "Ch"],
  ["\u0447", "ch"],
  ["\u0428", "Sh"],
  ["\u0448", "sh"],
  ["\u0429", "Sch"],
  ["\u0449", "sch"],
  ["\u042A", ""],
  ["\u044A", ""],
  ["\u042B", "Y"],
  ["\u044B", "y"],
  ["\u042C", ""],
  ["\u044C", ""],
  ["\u042D", "E"],
  ["\u044D", "e"],
  ["\u042E", "Yu"],
  ["\u044E", "yu"],
  ["\u042F", "Ya"],
  ["\u044F", "ya"],
  ["\u0103", "a"],
  ["\u0102", "A"],
  ["\u0219", "s"],
  ["\u0218", "S"],
  ["\u021B", "t"],
  ["\u021A", "T"],
  ["\u0163", "t"],
  ["\u0162", "T"],
  ["\u015F", "s"],
  ["\u015E", "S"],
  ["\xE7", "c"],
  ["\xC7", "C"],
  ["\u011F", "g"],
  ["\u011E", "G"],
  ["\u0131", "i"],
  ["\u0130", "I"],
  ["\u0561", "a"],
  ["\u0531", "A"],
  ["\u0562", "b"],
  ["\u0532", "B"],
  ["\u0563", "g"],
  ["\u0533", "G"],
  ["\u0564", "d"],
  ["\u0534", "D"],
  ["\u0565", "ye"],
  ["\u0535", "Ye"],
  ["\u0566", "z"],
  ["\u0536", "Z"],
  ["\u0567", "e"],
  ["\u0537", "E"],
  ["\u0568", "y"],
  ["\u0538", "Y"],
  ["\u0569", "t"],
  ["\u0539", "T"],
  ["\u056A", "zh"],
  ["\u053A", "Zh"],
  ["\u056B", "i"],
  ["\u053B", "I"],
  ["\u056C", "l"],
  ["\u053C", "L"],
  ["\u056D", "kh"],
  ["\u053D", "Kh"],
  ["\u056E", "ts"],
  ["\u053E", "Ts"],
  ["\u056F", "k"],
  ["\u053F", "K"],
  ["\u0570", "h"],
  ["\u0540", "H"],
  ["\u0571", "dz"],
  ["\u0541", "Dz"],
  ["\u0572", "gh"],
  ["\u0542", "Gh"],
  ["\u0573", "tch"],
  ["\u0543", "Tch"],
  ["\u0574", "m"],
  ["\u0544", "M"],
  ["\u0575", "y"],
  ["\u0545", "Y"],
  ["\u0576", "n"],
  ["\u0546", "N"],
  ["\u0577", "sh"],
  ["\u0547", "Sh"],
  ["\u0578", "vo"],
  ["\u0548", "Vo"],
  ["\u0579", "ch"],
  ["\u0549", "Ch"],
  ["\u057A", "p"],
  ["\u054A", "P"],
  ["\u057B", "j"],
  ["\u054B", "J"],
  ["\u057C", "r"],
  ["\u054C", "R"],
  ["\u057D", "s"],
  ["\u054D", "S"],
  ["\u057E", "v"],
  ["\u054E", "V"],
  ["\u057F", "t"],
  ["\u054F", "T"],
  ["\u0580", "r"],
  ["\u0550", "R"],
  ["\u0581", "c"],
  ["\u0551", "C"],
  ["\u0578\u0582", "u"],
  ["\u0548\u0552", "U"],
  ["\u0548\u0582", "U"],
  ["\u0583", "p"],
  ["\u0553", "P"],
  ["\u0584", "q"],
  ["\u0554", "Q"],
  ["\u0585", "o"],
  ["\u0555", "O"],
  ["\u0586", "f"],
  ["\u0556", "F"],
  ["\u0587", "yev"],
  ["\u10D0", "a"],
  ["\u10D1", "b"],
  ["\u10D2", "g"],
  ["\u10D3", "d"],
  ["\u10D4", "e"],
  ["\u10D5", "v"],
  ["\u10D6", "z"],
  ["\u10D7", "t"],
  ["\u10D8", "i"],
  ["\u10D9", "k"],
  ["\u10DA", "l"],
  ["\u10DB", "m"],
  ["\u10DC", "n"],
  ["\u10DD", "o"],
  ["\u10DE", "p"],
  ["\u10DF", "zh"],
  ["\u10E0", "r"],
  ["\u10E1", "s"],
  ["\u10E2", "t"],
  ["\u10E3", "u"],
  ["\u10E4", "ph"],
  ["\u10E5", "q"],
  ["\u10E6", "gh"],
  ["\u10E7", "k"],
  ["\u10E8", "sh"],
  ["\u10E9", "ch"],
  ["\u10EA", "ts"],
  ["\u10EB", "dz"],
  ["\u10EC", "ts"],
  ["\u10ED", "tch"],
  ["\u10EE", "kh"],
  ["\u10EF", "j"],
  ["\u10F0", "h"],
  ["\u010D", "c"],
  ["\u010F", "d"],
  ["\u011B", "e"],
  ["\u0148", "n"],
  ["\u0159", "r"],
  ["\u0161", "s"],
  ["\u0165", "t"],
  ["\u016F", "u"],
  ["\u017E", "z"],
  ["\u010C", "C"],
  ["\u010E", "D"],
  ["\u011A", "E"],
  ["\u0147", "N"],
  ["\u0158", "R"],
  ["\u0160", "S"],
  ["\u0164", "T"],
  ["\u016E", "U"],
  ["\u017D", "Z"],
  ["\u0780", "h"],
  ["\u0781", "sh"],
  ["\u0782", "n"],
  ["\u0783", "r"],
  ["\u0784", "b"],
  ["\u0785", "lh"],
  ["\u0786", "k"],
  ["\u0787", "a"],
  ["\u0788", "v"],
  ["\u0789", "m"],
  ["\u078A", "f"],
  ["\u078B", "dh"],
  ["\u078C", "th"],
  ["\u078D", "l"],
  ["\u078E", "g"],
  ["\u078F", "gn"],
  ["\u0790", "s"],
  ["\u0791", "d"],
  ["\u0792", "z"],
  ["\u0793", "t"],
  ["\u0794", "y"],
  ["\u0795", "p"],
  ["\u0796", "j"],
  ["\u0797", "ch"],
  ["\u0798", "tt"],
  ["\u0799", "hh"],
  ["\u079A", "kh"],
  ["\u079B", "th"],
  ["\u079C", "z"],
  ["\u079D", "sh"],
  ["\u079E", "s"],
  ["\u079F", "d"],
  ["\u07A0", "t"],
  ["\u07A1", "z"],
  ["\u07A2", "a"],
  ["\u07A3", "gh"],
  ["\u07A4", "q"],
  ["\u07A5", "w"],
  ["\u07A6", "a"],
  ["\u07A7", "aa"],
  ["\u07A8", "i"],
  ["\u07A9", "ee"],
  ["\u07AA", "u"],
  ["\u07AB", "oo"],
  ["\u07AC", "e"],
  ["\u07AD", "ey"],
  ["\u07AE", "o"],
  ["\u07AF", "oa"],
  ["\u07B0", ""],
  ["\u03B1", "a"],
  ["\u03B2", "v"],
  ["\u03B3", "g"],
  ["\u03B4", "d"],
  ["\u03B5", "e"],
  ["\u03B6", "z"],
  ["\u03B7", "i"],
  ["\u03B8", "th"],
  ["\u03B9", "i"],
  ["\u03BA", "k"],
  ["\u03BB", "l"],
  ["\u03BC", "m"],
  ["\u03BD", "n"],
  ["\u03BE", "ks"],
  ["\u03BF", "o"],
  ["\u03C0", "p"],
  ["\u03C1", "r"],
  ["\u03C3", "s"],
  ["\u03C4", "t"],
  ["\u03C5", "y"],
  ["\u03C6", "f"],
  ["\u03C7", "x"],
  ["\u03C8", "ps"],
  ["\u03C9", "o"],
  ["\u03AC", "a"],
  ["\u03AD", "e"],
  ["\u03AF", "i"],
  ["\u03CC", "o"],
  ["\u03CD", "y"],
  ["\u03AE", "i"],
  ["\u03CE", "o"],
  ["\u03C2", "s"],
  ["\u03CA", "i"],
  ["\u03B0", "y"],
  ["\u03CB", "y"],
  ["\u0390", "i"],
  ["\u0391", "A"],
  ["\u0392", "B"],
  ["\u0393", "G"],
  ["\u0394", "D"],
  ["\u0395", "E"],
  ["\u0396", "Z"],
  ["\u0397", "I"],
  ["\u0398", "TH"],
  ["\u0399", "I"],
  ["\u039A", "K"],
  ["\u039B", "L"],
  ["\u039C", "M"],
  ["\u039D", "N"],
  ["\u039E", "KS"],
  ["\u039F", "O"],
  ["\u03A0", "P"],
  ["\u03A1", "R"],
  ["\u03A3", "S"],
  ["\u03A4", "T"],
  ["\u03A5", "Y"],
  ["\u03A6", "F"],
  ["\u03A7", "X"],
  ["\u03A8", "PS"],
  ["\u03A9", "O"],
  ["\u0386", "A"],
  ["\u0388", "E"],
  ["\u038A", "I"],
  ["\u038C", "O"],
  ["\u038E", "Y"],
  ["\u0389", "I"],
  ["\u038F", "O"],
  ["\u03AA", "I"],
  ["\u03AB", "Y"],
  ["\u0101", "a"],
  ["\u0113", "e"],
  ["\u0123", "g"],
  ["\u012B", "i"],
  ["\u0137", "k"],
  ["\u013C", "l"],
  ["\u0146", "n"],
  ["\u016B", "u"],
  ["\u0100", "A"],
  ["\u0112", "E"],
  ["\u0122", "G"],
  ["\u012A", "I"],
  ["\u0136", "K"],
  ["\u013B", "L"],
  ["\u0145", "N"],
  ["\u016A", "U"],
  ["\u010D", "c"],
  ["\u0161", "s"],
  ["\u017E", "z"],
  ["\u010C", "C"],
  ["\u0160", "S"],
  ["\u017D", "Z"],
  ["\u0105", "a"],
  ["\u010D", "c"],
  ["\u0119", "e"],
  ["\u0117", "e"],
  ["\u012F", "i"],
  ["\u0161", "s"],
  ["\u0173", "u"],
  ["\u016B", "u"],
  ["\u017E", "z"],
  ["\u0104", "A"],
  ["\u010C", "C"],
  ["\u0118", "E"],
  ["\u0116", "E"],
  ["\u012E", "I"],
  ["\u0160", "S"],
  ["\u0172", "U"],
  ["\u016A", "U"],
  ["\u040C", "Kj"],
  ["\u045C", "kj"],
  ["\u0409", "Lj"],
  ["\u0459", "lj"],
  ["\u040A", "Nj"],
  ["\u045A", "nj"],
  ["\u0422\u0441", "Ts"],
  ["\u0442\u0441", "ts"],
  ["\u0105", "a"],
  ["\u0107", "c"],
  ["\u0119", "e"],
  ["\u0142", "l"],
  ["\u0144", "n"],
  ["\u015B", "s"],
  ["\u017A", "z"],
  ["\u017C", "z"],
  ["\u0104", "A"],
  ["\u0106", "C"],
  ["\u0118", "E"],
  ["\u0141", "L"],
  ["\u0143", "N"],
  ["\u015A", "S"],
  ["\u0179", "Z"],
  ["\u017B", "Z"],
  ["\u0404", "Ye"],
  ["\u0406", "I"],
  ["\u0407", "Yi"],
  ["\u0490", "G"],
  ["\u0454", "ye"],
  ["\u0456", "i"],
  ["\u0457", "yi"],
  ["\u0491", "g"],
  ["\u0132", "IJ"],
  ["\u0133", "ij"],
  ["\xA2", "c"],
  ["\xA5", "Y"],
  ["\u07FF", "b"],
  ["\u09F3", "t"],
  ["\u0AF1", "Bo"],
  ["\u0E3F", "B"],
  ["\u20A0", "CE"],
  ["\u20A1", "C"],
  ["\u20A2", "Cr"],
  ["\u20A3", "F"],
  ["\u20A5", "m"],
  ["\u20A6", "N"],
  ["\u20A7", "Pt"],
  ["\u20A8", "Rs"],
  ["\u20A9", "W"],
  ["\u20AB", "s"],
  ["\u20AC", "E"],
  ["\u20AD", "K"],
  ["\u20AE", "T"],
  ["\u20AF", "Dp"],
  ["\u20B0", "S"],
  ["\u20B1", "P"],
  ["\u20B2", "G"],
  ["\u20B3", "A"],
  ["\u20B4", "S"],
  ["\u20B5", "C"],
  ["\u20B6", "tt"],
  ["\u20B7", "S"],
  ["\u20B8", "T"],
  ["\u20B9", "R"],
  ["\u20BA", "L"],
  ["\u20BD", "P"],
  ["\u20BF", "B"],
  ["\uFE69", "$"],
  ["\uFFE0", "c"],
  ["\uFFE5", "Y"],
  ["\uFFE6", "W"],
  ["\uD835\uDC00", "A"],
  ["\uD835\uDC01", "B"],
  ["\uD835\uDC02", "C"],
  ["\uD835\uDC03", "D"],
  ["\uD835\uDC04", "E"],
  ["\uD835\uDC05", "F"],
  ["\uD835\uDC06", "G"],
  ["\uD835\uDC07", "H"],
  ["\uD835\uDC08", "I"],
  ["\uD835\uDC09", "J"],
  ["\uD835\uDC0A", "K"],
  ["\uD835\uDC0B", "L"],
  ["\uD835\uDC0C", "M"],
  ["\uD835\uDC0D", "N"],
  ["\uD835\uDC0E", "O"],
  ["\uD835\uDC0F", "P"],
  ["\uD835\uDC10", "Q"],
  ["\uD835\uDC11", "R"],
  ["\uD835\uDC12", "S"],
  ["\uD835\uDC13", "T"],
  ["\uD835\uDC14", "U"],
  ["\uD835\uDC15", "V"],
  ["\uD835\uDC16", "W"],
  ["\uD835\uDC17", "X"],
  ["\uD835\uDC18", "Y"],
  ["\uD835\uDC19", "Z"],
  ["\uD835\uDC1A", "a"],
  ["\uD835\uDC1B", "b"],
  ["\uD835\uDC1C", "c"],
  ["\uD835\uDC1D", "d"],
  ["\uD835\uDC1E", "e"],
  ["\uD835\uDC1F", "f"],
  ["\uD835\uDC20", "g"],
  ["\uD835\uDC21", "h"],
  ["\uD835\uDC22", "i"],
  ["\uD835\uDC23", "j"],
  ["\uD835\uDC24", "k"],
  ["\uD835\uDC25", "l"],
  ["\uD835\uDC26", "m"],
  ["\uD835\uDC27", "n"],
  ["\uD835\uDC28", "o"],
  ["\uD835\uDC29", "p"],
  ["\uD835\uDC2A", "q"],
  ["\uD835\uDC2B", "r"],
  ["\uD835\uDC2C", "s"],
  ["\uD835\uDC2D", "t"],
  ["\uD835\uDC2E", "u"],
  ["\uD835\uDC2F", "v"],
  ["\uD835\uDC30", "w"],
  ["\uD835\uDC31", "x"],
  ["\uD835\uDC32", "y"],
  ["\uD835\uDC33", "z"],
  ["\uD835\uDC34", "A"],
  ["\uD835\uDC35", "B"],
  ["\uD835\uDC36", "C"],
  ["\uD835\uDC37", "D"],
  ["\uD835\uDC38", "E"],
  ["\uD835\uDC39", "F"],
  ["\uD835\uDC3A", "G"],
  ["\uD835\uDC3B", "H"],
  ["\uD835\uDC3C", "I"],
  ["\uD835\uDC3D", "J"],
  ["\uD835\uDC3E", "K"],
  ["\uD835\uDC3F", "L"],
  ["\uD835\uDC40", "M"],
  ["\uD835\uDC41", "N"],
  ["\uD835\uDC42", "O"],
  ["\uD835\uDC43", "P"],
  ["\uD835\uDC44", "Q"],
  ["\uD835\uDC45", "R"],
  ["\uD835\uDC46", "S"],
  ["\uD835\uDC47", "T"],
  ["\uD835\uDC48", "U"],
  ["\uD835\uDC49", "V"],
  ["\uD835\uDC4A", "W"],
  ["\uD835\uDC4B", "X"],
  ["\uD835\uDC4C", "Y"],
  ["\uD835\uDC4D", "Z"],
  ["\uD835\uDC4E", "a"],
  ["\uD835\uDC4F", "b"],
  ["\uD835\uDC50", "c"],
  ["\uD835\uDC51", "d"],
  ["\uD835\uDC52", "e"],
  ["\uD835\uDC53", "f"],
  ["\uD835\uDC54", "g"],
  ["\uD835\uDC56", "i"],
  ["\uD835\uDC57", "j"],
  ["\uD835\uDC58", "k"],
  ["\uD835\uDC59", "l"],
  ["\uD835\uDC5A", "m"],
  ["\uD835\uDC5B", "n"],
  ["\uD835\uDC5C", "o"],
  ["\uD835\uDC5D", "p"],
  ["\uD835\uDC5E", "q"],
  ["\uD835\uDC5F", "r"],
  ["\uD835\uDC60", "s"],
  ["\uD835\uDC61", "t"],
  ["\uD835\uDC62", "u"],
  ["\uD835\uDC63", "v"],
  ["\uD835\uDC64", "w"],
  ["\uD835\uDC65", "x"],
  ["\uD835\uDC66", "y"],
  ["\uD835\uDC67", "z"],
  ["\uD835\uDC68", "A"],
  ["\uD835\uDC69", "B"],
  ["\uD835\uDC6A", "C"],
  ["\uD835\uDC6B", "D"],
  ["\uD835\uDC6C", "E"],
  ["\uD835\uDC6D", "F"],
  ["\uD835\uDC6E", "G"],
  ["\uD835\uDC6F", "H"],
  ["\uD835\uDC70", "I"],
  ["\uD835\uDC71", "J"],
  ["\uD835\uDC72", "K"],
  ["\uD835\uDC73", "L"],
  ["\uD835\uDC74", "M"],
  ["\uD835\uDC75", "N"],
  ["\uD835\uDC76", "O"],
  ["\uD835\uDC77", "P"],
  ["\uD835\uDC78", "Q"],
  ["\uD835\uDC79", "R"],
  ["\uD835\uDC7A", "S"],
  ["\uD835\uDC7B", "T"],
  ["\uD835\uDC7C", "U"],
  ["\uD835\uDC7D", "V"],
  ["\uD835\uDC7E", "W"],
  ["\uD835\uDC7F", "X"],
  ["\uD835\uDC80", "Y"],
  ["\uD835\uDC81", "Z"],
  ["\uD835\uDC82", "a"],
  ["\uD835\uDC83", "b"],
  ["\uD835\uDC84", "c"],
  ["\uD835\uDC85", "d"],
  ["\uD835\uDC86", "e"],
  ["\uD835\uDC87", "f"],
  ["\uD835\uDC88", "g"],
  ["\uD835\uDC89", "h"],
  ["\uD835\uDC8A", "i"],
  ["\uD835\uDC8B", "j"],
  ["\uD835\uDC8C", "k"],
  ["\uD835\uDC8D", "l"],
  ["\uD835\uDC8E", "m"],
  ["\uD835\uDC8F", "n"],
  ["\uD835\uDC90", "o"],
  ["\uD835\uDC91", "p"],
  ["\uD835\uDC92", "q"],
  ["\uD835\uDC93", "r"],
  ["\uD835\uDC94", "s"],
  ["\uD835\uDC95", "t"],
  ["\uD835\uDC96", "u"],
  ["\uD835\uDC97", "v"],
  ["\uD835\uDC98", "w"],
  ["\uD835\uDC99", "x"],
  ["\uD835\uDC9A", "y"],
  ["\uD835\uDC9B", "z"],
  ["\uD835\uDC9C", "A"],
  ["\uD835\uDC9E", "C"],
  ["\uD835\uDC9F", "D"],
  ["\uD835\uDCA2", "g"],
  ["\uD835\uDCA5", "J"],
  ["\uD835\uDCA6", "K"],
  ["\uD835\uDCA9", "N"],
  ["\uD835\uDCAA", "O"],
  ["\uD835\uDCAB", "P"],
  ["\uD835\uDCAC", "Q"],
  ["\uD835\uDCAE", "S"],
  ["\uD835\uDCAF", "T"],
  ["\uD835\uDCB0", "U"],
  ["\uD835\uDCB1", "V"],
  ["\uD835\uDCB2", "W"],
  ["\uD835\uDCB3", "X"],
  ["\uD835\uDCB4", "Y"],
  ["\uD835\uDCB5", "Z"],
  ["\uD835\uDCB6", "a"],
  ["\uD835\uDCB7", "b"],
  ["\uD835\uDCB8", "c"],
  ["\uD835\uDCB9", "d"],
  ["\uD835\uDCBB", "f"],
  ["\uD835\uDCBD", "h"],
  ["\uD835\uDCBE", "i"],
  ["\uD835\uDCBF", "j"],
  ["\uD835\uDCC0", "h"],
  ["\uD835\uDCC1", "l"],
  ["\uD835\uDCC2", "m"],
  ["\uD835\uDCC3", "n"],
  ["\uD835\uDCC5", "p"],
  ["\uD835\uDCC6", "q"],
  ["\uD835\uDCC7", "r"],
  ["\uD835\uDCC8", "s"],
  ["\uD835\uDCC9", "t"],
  ["\uD835\uDCCA", "u"],
  ["\uD835\uDCCB", "v"],
  ["\uD835\uDCCC", "w"],
  ["\uD835\uDCCD", "x"],
  ["\uD835\uDCCE", "y"],
  ["\uD835\uDCCF", "z"],
  ["\uD835\uDCD0", "A"],
  ["\uD835\uDCD1", "B"],
  ["\uD835\uDCD2", "C"],
  ["\uD835\uDCD3", "D"],
  ["\uD835\uDCD4", "E"],
  ["\uD835\uDCD5", "F"],
  ["\uD835\uDCD6", "G"],
  ["\uD835\uDCD7", "H"],
  ["\uD835\uDCD8", "I"],
  ["\uD835\uDCD9", "J"],
  ["\uD835\uDCDA", "K"],
  ["\uD835\uDCDB", "L"],
  ["\uD835\uDCDC", "M"],
  ["\uD835\uDCDD", "N"],
  ["\uD835\uDCDE", "O"],
  ["\uD835\uDCDF", "P"],
  ["\uD835\uDCE0", "Q"],
  ["\uD835\uDCE1", "R"],
  ["\uD835\uDCE2", "S"],
  ["\uD835\uDCE3", "T"],
  ["\uD835\uDCE4", "U"],
  ["\uD835\uDCE5", "V"],
  ["\uD835\uDCE6", "W"],
  ["\uD835\uDCE7", "X"],
  ["\uD835\uDCE8", "Y"],
  ["\uD835\uDCE9", "Z"],
  ["\uD835\uDCEA", "a"],
  ["\uD835\uDCEB", "b"],
  ["\uD835\uDCEC", "c"],
  ["\uD835\uDCED", "d"],
  ["\uD835\uDCEE", "e"],
  ["\uD835\uDCEF", "f"],
  ["\uD835\uDCF0", "g"],
  ["\uD835\uDCF1", "h"],
  ["\uD835\uDCF2", "i"],
  ["\uD835\uDCF3", "j"],
  ["\uD835\uDCF4", "k"],
  ["\uD835\uDCF5", "l"],
  ["\uD835\uDCF6", "m"],
  ["\uD835\uDCF7", "n"],
  ["\uD835\uDCF8", "o"],
  ["\uD835\uDCF9", "p"],
  ["\uD835\uDCFA", "q"],
  ["\uD835\uDCFB", "r"],
  ["\uD835\uDCFC", "s"],
  ["\uD835\uDCFD", "t"],
  ["\uD835\uDCFE", "u"],
  ["\uD835\uDCFF", "v"],
  ["\uD835\uDD00", "w"],
  ["\uD835\uDD01", "x"],
  ["\uD835\uDD02", "y"],
  ["\uD835\uDD03", "z"],
  ["\uD835\uDD04", "A"],
  ["\uD835\uDD05", "B"],
  ["\uD835\uDD07", "D"],
  ["\uD835\uDD08", "E"],
  ["\uD835\uDD09", "F"],
  ["\uD835\uDD0A", "G"],
  ["\uD835\uDD0D", "J"],
  ["\uD835\uDD0E", "K"],
  ["\uD835\uDD0F", "L"],
  ["\uD835\uDD10", "M"],
  ["\uD835\uDD11", "N"],
  ["\uD835\uDD12", "O"],
  ["\uD835\uDD13", "P"],
  ["\uD835\uDD14", "Q"],
  ["\uD835\uDD16", "S"],
  ["\uD835\uDD17", "T"],
  ["\uD835\uDD18", "U"],
  ["\uD835\uDD19", "V"],
  ["\uD835\uDD1A", "W"],
  ["\uD835\uDD1B", "X"],
  ["\uD835\uDD1C", "Y"],
  ["\uD835\uDD1E", "a"],
  ["\uD835\uDD1F", "b"],
  ["\uD835\uDD20", "c"],
  ["\uD835\uDD21", "d"],
  ["\uD835\uDD22", "e"],
  ["\uD835\uDD23", "f"],
  ["\uD835\uDD24", "g"],
  ["\uD835\uDD25", "h"],
  ["\uD835\uDD26", "i"],
  ["\uD835\uDD27", "j"],
  ["\uD835\uDD28", "k"],
  ["\uD835\uDD29", "l"],
  ["\uD835\uDD2A", "m"],
  ["\uD835\uDD2B", "n"],
  ["\uD835\uDD2C", "o"],
  ["\uD835\uDD2D", "p"],
  ["\uD835\uDD2E", "q"],
  ["\uD835\uDD2F", "r"],
  ["\uD835\uDD30", "s"],
  ["\uD835\uDD31", "t"],
  ["\uD835\uDD32", "u"],
  ["\uD835\uDD33", "v"],
  ["\uD835\uDD34", "w"],
  ["\uD835\uDD35", "x"],
  ["\uD835\uDD36", "y"],
  ["\uD835\uDD37", "z"],
  ["\uD835\uDD38", "A"],
  ["\uD835\uDD39", "B"],
  ["\uD835\uDD3B", "D"],
  ["\uD835\uDD3C", "E"],
  ["\uD835\uDD3D", "F"],
  ["\uD835\uDD3E", "G"],
  ["\uD835\uDD40", "I"],
  ["\uD835\uDD41", "J"],
  ["\uD835\uDD42", "K"],
  ["\uD835\uDD43", "L"],
  ["\uD835\uDD44", "M"],
  ["\uD835\uDD46", "N"],
  ["\uD835\uDD4A", "S"],
  ["\uD835\uDD4B", "T"],
  ["\uD835\uDD4C", "U"],
  ["\uD835\uDD4D", "V"],
  ["\uD835\uDD4E", "W"],
  ["\uD835\uDD4F", "X"],
  ["\uD835\uDD50", "Y"],
  ["\uD835\uDD52", "a"],
  ["\uD835\uDD53", "b"],
  ["\uD835\uDD54", "c"],
  ["\uD835\uDD55", "d"],
  ["\uD835\uDD56", "e"],
  ["\uD835\uDD57", "f"],
  ["\uD835\uDD58", "g"],
  ["\uD835\uDD59", "h"],
  ["\uD835\uDD5A", "i"],
  ["\uD835\uDD5B", "j"],
  ["\uD835\uDD5C", "k"],
  ["\uD835\uDD5D", "l"],
  ["\uD835\uDD5E", "m"],
  ["\uD835\uDD5F", "n"],
  ["\uD835\uDD60", "o"],
  ["\uD835\uDD61", "p"],
  ["\uD835\uDD62", "q"],
  ["\uD835\uDD63", "r"],
  ["\uD835\uDD64", "s"],
  ["\uD835\uDD65", "t"],
  ["\uD835\uDD66", "u"],
  ["\uD835\uDD67", "v"],
  ["\uD835\uDD68", "w"],
  ["\uD835\uDD69", "x"],
  ["\uD835\uDD6A", "y"],
  ["\uD835\uDD6B", "z"],
  ["\uD835\uDD6C", "A"],
  ["\uD835\uDD6D", "B"],
  ["\uD835\uDD6E", "C"],
  ["\uD835\uDD6F", "D"],
  ["\uD835\uDD70", "E"],
  ["\uD835\uDD71", "F"],
  ["\uD835\uDD72", "G"],
  ["\uD835\uDD73", "H"],
  ["\uD835\uDD74", "I"],
  ["\uD835\uDD75", "J"],
  ["\uD835\uDD76", "K"],
  ["\uD835\uDD77", "L"],
  ["\uD835\uDD78", "M"],
  ["\uD835\uDD79", "N"],
  ["\uD835\uDD7A", "O"],
  ["\uD835\uDD7B", "P"],
  ["\uD835\uDD7C", "Q"],
  ["\uD835\uDD7D", "R"],
  ["\uD835\uDD7E", "S"],
  ["\uD835\uDD7F", "T"],
  ["\uD835\uDD80", "U"],
  ["\uD835\uDD81", "V"],
  ["\uD835\uDD82", "W"],
  ["\uD835\uDD83", "X"],
  ["\uD835\uDD84", "Y"],
  ["\uD835\uDD85", "Z"],
  ["\uD835\uDD86", "a"],
  ["\uD835\uDD87", "b"],
  ["\uD835\uDD88", "c"],
  ["\uD835\uDD89", "d"],
  ["\uD835\uDD8A", "e"],
  ["\uD835\uDD8B", "f"],
  ["\uD835\uDD8C", "g"],
  ["\uD835\uDD8D", "h"],
  ["\uD835\uDD8E", "i"],
  ["\uD835\uDD8F", "j"],
  ["\uD835\uDD90", "k"],
  ["\uD835\uDD91", "l"],
  ["\uD835\uDD92", "m"],
  ["\uD835\uDD93", "n"],
  ["\uD835\uDD94", "o"],
  ["\uD835\uDD95", "p"],
  ["\uD835\uDD96", "q"],
  ["\uD835\uDD97", "r"],
  ["\uD835\uDD98", "s"],
  ["\uD835\uDD99", "t"],
  ["\uD835\uDD9A", "u"],
  ["\uD835\uDD9B", "v"],
  ["\uD835\uDD9C", "w"],
  ["\uD835\uDD9D", "x"],
  ["\uD835\uDD9E", "y"],
  ["\uD835\uDD9F", "z"],
  ["\uD835\uDDA0", "A"],
  ["\uD835\uDDA1", "B"],
  ["\uD835\uDDA2", "C"],
  ["\uD835\uDDA3", "D"],
  ["\uD835\uDDA4", "E"],
  ["\uD835\uDDA5", "F"],
  ["\uD835\uDDA6", "G"],
  ["\uD835\uDDA7", "H"],
  ["\uD835\uDDA8", "I"],
  ["\uD835\uDDA9", "J"],
  ["\uD835\uDDAA", "K"],
  ["\uD835\uDDAB", "L"],
  ["\uD835\uDDAC", "M"],
  ["\uD835\uDDAD", "N"],
  ["\uD835\uDDAE", "O"],
  ["\uD835\uDDAF", "P"],
  ["\uD835\uDDB0", "Q"],
  ["\uD835\uDDB1", "R"],
  ["\uD835\uDDB2", "S"],
  ["\uD835\uDDB3", "T"],
  ["\uD835\uDDB4", "U"],
  ["\uD835\uDDB5", "V"],
  ["\uD835\uDDB6", "W"],
  ["\uD835\uDDB7", "X"],
  ["\uD835\uDDB8", "Y"],
  ["\uD835\uDDB9", "Z"],
  ["\uD835\uDDBA", "a"],
  ["\uD835\uDDBB", "b"],
  ["\uD835\uDDBC", "c"],
  ["\uD835\uDDBD", "d"],
  ["\uD835\uDDBE", "e"],
  ["\uD835\uDDBF", "f"],
  ["\uD835\uDDC0", "g"],
  ["\uD835\uDDC1", "h"],
  ["\uD835\uDDC2", "i"],
  ["\uD835\uDDC3", "j"],
  ["\uD835\uDDC4", "k"],
  ["\uD835\uDDC5", "l"],
  ["\uD835\uDDC6", "m"],
  ["\uD835\uDDC7", "n"],
  ["\uD835\uDDC8", "o"],
  ["\uD835\uDDC9", "p"],
  ["\uD835\uDDCA", "q"],
  ["\uD835\uDDCB", "r"],
  ["\uD835\uDDCC", "s"],
  ["\uD835\uDDCD", "t"],
  ["\uD835\uDDCE", "u"],
  ["\uD835\uDDCF", "v"],
  ["\uD835\uDDD0", "w"],
  ["\uD835\uDDD1", "x"],
  ["\uD835\uDDD2", "y"],
  ["\uD835\uDDD3", "z"],
  ["\uD835\uDDD4", "A"],
  ["\uD835\uDDD5", "B"],
  ["\uD835\uDDD6", "C"],
  ["\uD835\uDDD7", "D"],
  ["\uD835\uDDD8", "E"],
  ["\uD835\uDDD9", "F"],
  ["\uD835\uDDDA", "G"],
  ["\uD835\uDDDB", "H"],
  ["\uD835\uDDDC", "I"],
  ["\uD835\uDDDD", "J"],
  ["\uD835\uDDDE", "K"],
  ["\uD835\uDDDF", "L"],
  ["\uD835\uDDE0", "M"],
  ["\uD835\uDDE1", "N"],
  ["\uD835\uDDE2", "O"],
  ["\uD835\uDDE3", "P"],
  ["\uD835\uDDE4", "Q"],
  ["\uD835\uDDE5", "R"],
  ["\uD835\uDDE6", "S"],
  ["\uD835\uDDE7", "T"],
  ["\uD835\uDDE8", "U"],
  ["\uD835\uDDE9", "V"],
  ["\uD835\uDDEA", "W"],
  ["\uD835\uDDEB", "X"],
  ["\uD835\uDDEC", "Y"],
  ["\uD835\uDDED", "Z"],
  ["\uD835\uDDEE", "a"],
  ["\uD835\uDDEF", "b"],
  ["\uD835\uDDF0", "c"],
  ["\uD835\uDDF1", "d"],
  ["\uD835\uDDF2", "e"],
  ["\uD835\uDDF3", "f"],
  ["\uD835\uDDF4", "g"],
  ["\uD835\uDDF5", "h"],
  ["\uD835\uDDF6", "i"],
  ["\uD835\uDDF7", "j"],
  ["\uD835\uDDF8", "k"],
  ["\uD835\uDDF9", "l"],
  ["\uD835\uDDFA", "m"],
  ["\uD835\uDDFB", "n"],
  ["\uD835\uDDFC", "o"],
  ["\uD835\uDDFD", "p"],
  ["\uD835\uDDFE", "q"],
  ["\uD835\uDDFF", "r"],
  ["\uD835\uDE00", "s"],
  ["\uD835\uDE01", "t"],
  ["\uD835\uDE02", "u"],
  ["\uD835\uDE03", "v"],
  ["\uD835\uDE04", "w"],
  ["\uD835\uDE05", "x"],
  ["\uD835\uDE06", "y"],
  ["\uD835\uDE07", "z"],
  ["\uD835\uDE08", "A"],
  ["\uD835\uDE09", "B"],
  ["\uD835\uDE0A", "C"],
  ["\uD835\uDE0B", "D"],
  ["\uD835\uDE0C", "E"],
  ["\uD835\uDE0D", "F"],
  ["\uD835\uDE0E", "G"],
  ["\uD835\uDE0F", "H"],
  ["\uD835\uDE10", "I"],
  ["\uD835\uDE11", "J"],
  ["\uD835\uDE12", "K"],
  ["\uD835\uDE13", "L"],
  ["\uD835\uDE14", "M"],
  ["\uD835\uDE15", "N"],
  ["\uD835\uDE16", "O"],
  ["\uD835\uDE17", "P"],
  ["\uD835\uDE18", "Q"],
  ["\uD835\uDE19", "R"],
  ["\uD835\uDE1A", "S"],
  ["\uD835\uDE1B", "T"],
  ["\uD835\uDE1C", "U"],
  ["\uD835\uDE1D", "V"],
  ["\uD835\uDE1E", "W"],
  ["\uD835\uDE1F", "X"],
  ["\uD835\uDE20", "Y"],
  ["\uD835\uDE21", "Z"],
  ["\uD835\uDE22", "a"],
  ["\uD835\uDE23", "b"],
  ["\uD835\uDE24", "c"],
  ["\uD835\uDE25", "d"],
  ["\uD835\uDE26", "e"],
  ["\uD835\uDE27", "f"],
  ["\uD835\uDE28", "g"],
  ["\uD835\uDE29", "h"],
  ["\uD835\uDE2A", "i"],
  ["\uD835\uDE2B", "j"],
  ["\uD835\uDE2C", "k"],
  ["\uD835\uDE2D", "l"],
  ["\uD835\uDE2E", "m"],
  ["\uD835\uDE2F", "n"],
  ["\uD835\uDE30", "o"],
  ["\uD835\uDE31", "p"],
  ["\uD835\uDE32", "q"],
  ["\uD835\uDE33", "r"],
  ["\uD835\uDE34", "s"],
  ["\uD835\uDE35", "t"],
  ["\uD835\uDE36", "u"],
  ["\uD835\uDE37", "v"],
  ["\uD835\uDE38", "w"],
  ["\uD835\uDE39", "x"],
  ["\uD835\uDE3A", "y"],
  ["\uD835\uDE3B", "z"],
  ["\uD835\uDE3C", "A"],
  ["\uD835\uDE3D", "B"],
  ["\uD835\uDE3E", "C"],
  ["\uD835\uDE3F", "D"],
  ["\uD835\uDE40", "E"],
  ["\uD835\uDE41", "F"],
  ["\uD835\uDE42", "G"],
  ["\uD835\uDE43", "H"],
  ["\uD835\uDE44", "I"],
  ["\uD835\uDE45", "J"],
  ["\uD835\uDE46", "K"],
  ["\uD835\uDE47", "L"],
  ["\uD835\uDE48", "M"],
  ["\uD835\uDE49", "N"],
  ["\uD835\uDE4A", "O"],
  ["\uD835\uDE4B", "P"],
  ["\uD835\uDE4C", "Q"],
  ["\uD835\uDE4D", "R"],
  ["\uD835\uDE4E", "S"],
  ["\uD835\uDE4F", "T"],
  ["\uD835\uDE50", "U"],
  ["\uD835\uDE51", "V"],
  ["\uD835\uDE52", "W"],
  ["\uD835\uDE53", "X"],
  ["\uD835\uDE54", "Y"],
  ["\uD835\uDE55", "Z"],
  ["\uD835\uDE56", "a"],
  ["\uD835\uDE57", "b"],
  ["\uD835\uDE58", "c"],
  ["\uD835\uDE59", "d"],
  ["\uD835\uDE5A", "e"],
  ["\uD835\uDE5B", "f"],
  ["\uD835\uDE5C", "g"],
  ["\uD835\uDE5D", "h"],
  ["\uD835\uDE5E", "i"],
  ["\uD835\uDE5F", "j"],
  ["\uD835\uDE60", "k"],
  ["\uD835\uDE61", "l"],
  ["\uD835\uDE62", "m"],
  ["\uD835\uDE63", "n"],
  ["\uD835\uDE64", "o"],
  ["\uD835\uDE65", "p"],
  ["\uD835\uDE66", "q"],
  ["\uD835\uDE67", "r"],
  ["\uD835\uDE68", "s"],
  ["\uD835\uDE69", "t"],
  ["\uD835\uDE6A", "u"],
  ["\uD835\uDE6B", "v"],
  ["\uD835\uDE6C", "w"],
  ["\uD835\uDE6D", "x"],
  ["\uD835\uDE6E", "y"],
  ["\uD835\uDE6F", "z"],
  ["\uD835\uDE70", "A"],
  ["\uD835\uDE71", "B"],
  ["\uD835\uDE72", "C"],
  ["\uD835\uDE73", "D"],
  ["\uD835\uDE74", "E"],
  ["\uD835\uDE75", "F"],
  ["\uD835\uDE76", "G"],
  ["\uD835\uDE77", "H"],
  ["\uD835\uDE78", "I"],
  ["\uD835\uDE79", "J"],
  ["\uD835\uDE7A", "K"],
  ["\uD835\uDE7B", "L"],
  ["\uD835\uDE7C", "M"],
  ["\uD835\uDE7D", "N"],
  ["\uD835\uDE7E", "O"],
  ["\uD835\uDE7F", "P"],
  ["\uD835\uDE80", "Q"],
  ["\uD835\uDE81", "R"],
  ["\uD835\uDE82", "S"],
  ["\uD835\uDE83", "T"],
  ["\uD835\uDE84", "U"],
  ["\uD835\uDE85", "V"],
  ["\uD835\uDE86", "W"],
  ["\uD835\uDE87", "X"],
  ["\uD835\uDE88", "Y"],
  ["\uD835\uDE89", "Z"],
  ["\uD835\uDE8A", "a"],
  ["\uD835\uDE8B", "b"],
  ["\uD835\uDE8C", "c"],
  ["\uD835\uDE8D", "d"],
  ["\uD835\uDE8E", "e"],
  ["\uD835\uDE8F", "f"],
  ["\uD835\uDE90", "g"],
  ["\uD835\uDE91", "h"],
  ["\uD835\uDE92", "i"],
  ["\uD835\uDE93", "j"],
  ["\uD835\uDE94", "k"],
  ["\uD835\uDE95", "l"],
  ["\uD835\uDE96", "m"],
  ["\uD835\uDE97", "n"],
  ["\uD835\uDE98", "o"],
  ["\uD835\uDE99", "p"],
  ["\uD835\uDE9A", "q"],
  ["\uD835\uDE9B", "r"],
  ["\uD835\uDE9C", "s"],
  ["\uD835\uDE9D", "t"],
  ["\uD835\uDE9E", "u"],
  ["\uD835\uDE9F", "v"],
  ["\uD835\uDEA0", "w"],
  ["\uD835\uDEA1", "x"],
  ["\uD835\uDEA2", "y"],
  ["\uD835\uDEA3", "z"],
  ["\uD835\uDEA4", "l"],
  ["\uD835\uDEA5", "j"],
  ["\uD835\uDEE2", "A"],
  ["\uD835\uDEE3", "B"],
  ["\uD835\uDEE4", "G"],
  ["\uD835\uDEE5", "D"],
  ["\uD835\uDEE6", "E"],
  ["\uD835\uDEE7", "Z"],
  ["\uD835\uDEE8", "I"],
  ["\uD835\uDEE9", "TH"],
  ["\uD835\uDEEA", "I"],
  ["\uD835\uDEEB", "K"],
  ["\uD835\uDEEC", "L"],
  ["\uD835\uDEED", "M"],
  ["\uD835\uDEEE", "N"],
  ["\uD835\uDEEF", "KS"],
  ["\uD835\uDEF0", "O"],
  ["\uD835\uDEF1", "P"],
  ["\uD835\uDEF2", "R"],
  ["\uD835\uDEF3", "TH"],
  ["\uD835\uDEF4", "S"],
  ["\uD835\uDEF5", "T"],
  ["\uD835\uDEF6", "Y"],
  ["\uD835\uDEF7", "F"],
  ["\uD835\uDEF8", "x"],
  ["\uD835\uDEF9", "PS"],
  ["\uD835\uDEFA", "O"],
  ["\uD835\uDEFB", "D"],
  ["\uD835\uDEFC", "a"],
  ["\uD835\uDEFD", "b"],
  ["\uD835\uDEFE", "g"],
  ["\uD835\uDEFF", "d"],
  ["\uD835\uDF00", "e"],
  ["\uD835\uDF01", "z"],
  ["\uD835\uDF02", "i"],
  ["\uD835\uDF03", "th"],
  ["\uD835\uDF04", "i"],
  ["\uD835\uDF05", "k"],
  ["\uD835\uDF06", "l"],
  ["\uD835\uDF07", "m"],
  ["\uD835\uDF08", "n"],
  ["\uD835\uDF09", "ks"],
  ["\uD835\uDF0A", "o"],
  ["\uD835\uDF0B", "p"],
  ["\uD835\uDF0C", "r"],
  ["\uD835\uDF0D", "s"],
  ["\uD835\uDF0E", "s"],
  ["\uD835\uDF0F", "t"],
  ["\uD835\uDF10", "y"],
  ["\uD835\uDF11", "f"],
  ["\uD835\uDF12", "x"],
  ["\uD835\uDF13", "ps"],
  ["\uD835\uDF14", "o"],
  ["\uD835\uDF15", "d"],
  ["\uD835\uDF16", "E"],
  ["\uD835\uDF17", "TH"],
  ["\uD835\uDF18", "K"],
  ["\uD835\uDF19", "f"],
  ["\uD835\uDF1A", "r"],
  ["\uD835\uDF1B", "p"],
  ["\uD835\uDF1C", "A"],
  ["\uD835\uDF1D", "V"],
  ["\uD835\uDF1E", "G"],
  ["\uD835\uDF1F", "D"],
  ["\uD835\uDF20", "E"],
  ["\uD835\uDF21", "Z"],
  ["\uD835\uDF22", "I"],
  ["\uD835\uDF23", "TH"],
  ["\uD835\uDF24", "I"],
  ["\uD835\uDF25", "K"],
  ["\uD835\uDF26", "L"],
  ["\uD835\uDF27", "M"],
  ["\uD835\uDF28", "N"],
  ["\uD835\uDF29", "KS"],
  ["\uD835\uDF2A", "O"],
  ["\uD835\uDF2B", "P"],
  ["\uD835\uDF2C", "S"],
  ["\uD835\uDF2D", "TH"],
  ["\uD835\uDF2E", "S"],
  ["\uD835\uDF2F", "T"],
  ["\uD835\uDF30", "Y"],
  ["\uD835\uDF31", "F"],
  ["\uD835\uDF32", "X"],
  ["\uD835\uDF33", "PS"],
  ["\uD835\uDF34", "O"],
  ["\uD835\uDF35", "D"],
  ["\uD835\uDF36", "a"],
  ["\uD835\uDF37", "v"],
  ["\uD835\uDF38", "g"],
  ["\uD835\uDF39", "d"],
  ["\uD835\uDF3A", "e"],
  ["\uD835\uDF3B", "z"],
  ["\uD835\uDF3C", "i"],
  ["\uD835\uDF3D", "th"],
  ["\uD835\uDF3E", "i"],
  ["\uD835\uDF3F", "k"],
  ["\uD835\uDF40", "l"],
  ["\uD835\uDF41", "m"],
  ["\uD835\uDF42", "n"],
  ["\uD835\uDF43", "ks"],
  ["\uD835\uDF44", "o"],
  ["\uD835\uDF45", "p"],
  ["\uD835\uDF46", "r"],
  ["\uD835\uDF47", "s"],
  ["\uD835\uDF48", "s"],
  ["\uD835\uDF49", "t"],
  ["\uD835\uDF4A", "y"],
  ["\uD835\uDF4B", "f"],
  ["\uD835\uDF4C", "x"],
  ["\uD835\uDF4D", "ps"],
  ["\uD835\uDF4E", "o"],
  ["\uD835\uDF4F", "a"],
  ["\uD835\uDF50", "e"],
  ["\uD835\uDF51", "i"],
  ["\uD835\uDF52", "k"],
  ["\uD835\uDF53", "f"],
  ["\uD835\uDF54", "r"],
  ["\uD835\uDF55", "p"],
  ["\uD835\uDF56", "A"],
  ["\uD835\uDF57", "B"],
  ["\uD835\uDF58", "G"],
  ["\uD835\uDF59", "D"],
  ["\uD835\uDF5A", "E"],
  ["\uD835\uDF5B", "Z"],
  ["\uD835\uDF5C", "I"],
  ["\uD835\uDF5D", "TH"],
  ["\uD835\uDF5E", "I"],
  ["\uD835\uDF5F", "K"],
  ["\uD835\uDF60", "L"],
  ["\uD835\uDF61", "M"],
  ["\uD835\uDF62", "N"],
  ["\uD835\uDF63", "KS"],
  ["\uD835\uDF64", "O"],
  ["\uD835\uDF65", "P"],
  ["\uD835\uDF66", "R"],
  ["\uD835\uDF67", "TH"],
  ["\uD835\uDF68", "S"],
  ["\uD835\uDF69", "T"],
  ["\uD835\uDF6A", "Y"],
  ["\uD835\uDF6B", "F"],
  ["\uD835\uDF6C", "X"],
  ["\uD835\uDF6D", "PS"],
  ["\uD835\uDF6E", "O"],
  ["\uD835\uDF6F", "D"],
  ["\uD835\uDF70", "a"],
  ["\uD835\uDF71", "v"],
  ["\uD835\uDF72", "g"],
  ["\uD835\uDF73", "d"],
  ["\uD835\uDF74", "e"],
  ["\uD835\uDF75", "z"],
  ["\uD835\uDF76", "i"],
  ["\uD835\uDF77", "th"],
  ["\uD835\uDF78", "i"],
  ["\uD835\uDF79", "k"],
  ["\uD835\uDF7A", "l"],
  ["\uD835\uDF7B", "m"],
  ["\uD835\uDF7C", "n"],
  ["\uD835\uDF7D", "ks"],
  ["\uD835\uDF7E", "o"],
  ["\uD835\uDF7F", "p"],
  ["\uD835\uDF80", "r"],
  ["\uD835\uDF81", "s"],
  ["\uD835\uDF82", "s"],
  ["\uD835\uDF83", "t"],
  ["\uD835\uDF84", "y"],
  ["\uD835\uDF85", "f"],
  ["\uD835\uDF86", "x"],
  ["\uD835\uDF87", "ps"],
  ["\uD835\uDF88", "o"],
  ["\uD835\uDF89", "a"],
  ["\uD835\uDF8A", "e"],
  ["\uD835\uDF8B", "i"],
  ["\uD835\uDF8C", "k"],
  ["\uD835\uDF8D", "f"],
  ["\uD835\uDF8E", "r"],
  ["\uD835\uDF8F", "p"],
  ["\uD835\uDF90", "A"],
  ["\uD835\uDF91", "V"],
  ["\uD835\uDF92", "G"],
  ["\uD835\uDF93", "D"],
  ["\uD835\uDF94", "E"],
  ["\uD835\uDF95", "Z"],
  ["\uD835\uDF96", "I"],
  ["\uD835\uDF97", "TH"],
  ["\uD835\uDF98", "I"],
  ["\uD835\uDF99", "K"],
  ["\uD835\uDF9A", "L"],
  ["\uD835\uDF9B", "M"],
  ["\uD835\uDF9C", "N"],
  ["\uD835\uDF9D", "KS"],
  ["\uD835\uDF9E", "O"],
  ["\uD835\uDF9F", "P"],
  ["\uD835\uDFA0", "S"],
  ["\uD835\uDFA1", "TH"],
  ["\uD835\uDFA2", "S"],
  ["\uD835\uDFA3", "T"],
  ["\uD835\uDFA4", "Y"],
  ["\uD835\uDFA5", "F"],
  ["\uD835\uDFA6", "X"],
  ["\uD835\uDFA7", "PS"],
  ["\uD835\uDFA8", "O"],
  ["\uD835\uDFA9", "D"],
  ["\uD835\uDFAA", "av"],
  ["\uD835\uDFAB", "g"],
  ["\uD835\uDFAC", "d"],
  ["\uD835\uDFAD", "e"],
  ["\uD835\uDFAE", "z"],
  ["\uD835\uDFAF", "i"],
  ["\uD835\uDFB0", "i"],
  ["\uD835\uDFB1", "th"],
  ["\uD835\uDFB2", "i"],
  ["\uD835\uDFB3", "k"],
  ["\uD835\uDFB4", "l"],
  ["\uD835\uDFB5", "m"],
  ["\uD835\uDFB6", "n"],
  ["\uD835\uDFB7", "ks"],
  ["\uD835\uDFB8", "o"],
  ["\uD835\uDFB9", "p"],
  ["\uD835\uDFBA", "r"],
  ["\uD835\uDFBB", "s"],
  ["\uD835\uDFBC", "s"],
  ["\uD835\uDFBD", "t"],
  ["\uD835\uDFBE", "y"],
  ["\uD835\uDFBF", "f"],
  ["\uD835\uDFC0", "x"],
  ["\uD835\uDFC1", "ps"],
  ["\uD835\uDFC2", "o"],
  ["\uD835\uDFC3", "a"],
  ["\uD835\uDFC4", "e"],
  ["\uD835\uDFC5", "i"],
  ["\uD835\uDFC6", "k"],
  ["\uD835\uDFC7", "f"],
  ["\uD835\uDFC8", "r"],
  ["\uD835\uDFC9", "p"],
  ["\uD835\uDFCA", "F"],
  ["\uD835\uDFCB", "f"],
  ["\u249C", "(a)"],
  ["\u249D", "(b)"],
  ["\u249E", "(c)"],
  ["\u249F", "(d)"],
  ["\u24A0", "(e)"],
  ["\u24A1", "(f)"],
  ["\u24A2", "(g)"],
  ["\u24A3", "(h)"],
  ["\u24A4", "(i)"],
  ["\u24A5", "(j)"],
  ["\u24A6", "(k)"],
  ["\u24A7", "(l)"],
  ["\u24A8", "(m)"],
  ["\u24A9", "(n)"],
  ["\u24AA", "(o)"],
  ["\u24AB", "(p)"],
  ["\u24AC", "(q)"],
  ["\u24AD", "(r)"],
  ["\u24AE", "(s)"],
  ["\u24AF", "(t)"],
  ["\u24B0", "(u)"],
  ["\u24B1", "(v)"],
  ["\u24B2", "(w)"],
  ["\u24B3", "(x)"],
  ["\u24B4", "(y)"],
  ["\u24B5", "(z)"],
  ["\u24B6", "(A)"],
  ["\u24B7", "(B)"],
  ["\u24B8", "(C)"],
  ["\u24B9", "(D)"],
  ["\u24BA", "(E)"],
  ["\u24BB", "(F)"],
  ["\u24BC", "(G)"],
  ["\u24BD", "(H)"],
  ["\u24BE", "(I)"],
  ["\u24BF", "(J)"],
  ["\u24C0", "(K)"],
  ["\u24C1", "(L)"],
  ["\u24C3", "(N)"],
  ["\u24C4", "(O)"],
  ["\u24C5", "(P)"],
  ["\u24C6", "(Q)"],
  ["\u24C7", "(R)"],
  ["\u24C8", "(S)"],
  ["\u24C9", "(T)"],
  ["\u24CA", "(U)"],
  ["\u24CB", "(V)"],
  ["\u24CC", "(W)"],
  ["\u24CD", "(X)"],
  ["\u24CE", "(Y)"],
  ["\u24CF", "(Z)"],
  ["\u24D0", "(a)"],
  ["\u24D1", "(b)"],
  ["\u24D2", "(b)"],
  ["\u24D3", "(c)"],
  ["\u24D4", "(e)"],
  ["\u24D5", "(f)"],
  ["\u24D6", "(g)"],
  ["\u24D7", "(h)"],
  ["\u24D8", "(i)"],
  ["\u24D9", "(j)"],
  ["\u24DA", "(k)"],
  ["\u24DB", "(l)"],
  ["\u24DC", "(m)"],
  ["\u24DD", "(n)"],
  ["\u24DE", "(o)"],
  ["\u24DF", "(p)"],
  ["\u24E0", "(q)"],
  ["\u24E1", "(r)"],
  ["\u24E2", "(s)"],
  ["\u24E3", "(t)"],
  ["\u24E4", "(u)"],
  ["\u24E5", "(v)"],
  ["\u24E6", "(w)"],
  ["\u24E7", "(x)"],
  ["\u24E8", "(y)"],
  ["\u24E9", "(z)"],
  ["\u010A", "C"],
  ["\u010B", "c"],
  ["\u0120", "G"],
  ["\u0121", "g"],
  ["\u0126", "H"],
  ["\u0127", "h"],
  ["\u017B", "Z"],
  ["\u017C", "z"],
  ["\uD835\uDFCE", "0"],
  ["\uD835\uDFCF", "1"],
  ["\uD835\uDFD0", "2"],
  ["\uD835\uDFD1", "3"],
  ["\uD835\uDFD2", "4"],
  ["\uD835\uDFD3", "5"],
  ["\uD835\uDFD4", "6"],
  ["\uD835\uDFD5", "7"],
  ["\uD835\uDFD6", "8"],
  ["\uD835\uDFD7", "9"],
  ["\uD835\uDFD8", "0"],
  ["\uD835\uDFD9", "1"],
  ["\uD835\uDFDA", "2"],
  ["\uD835\uDFDB", "3"],
  ["\uD835\uDFDC", "4"],
  ["\uD835\uDFDD", "5"],
  ["\uD835\uDFDE", "6"],
  ["\uD835\uDFDF", "7"],
  ["\uD835\uDFE0", "8"],
  ["\uD835\uDFE1", "9"],
  ["\uD835\uDFE2", "0"],
  ["\uD835\uDFE3", "1"],
  ["\uD835\uDFE4", "2"],
  ["\uD835\uDFE5", "3"],
  ["\uD835\uDFE6", "4"],
  ["\uD835\uDFE7", "5"],
  ["\uD835\uDFE8", "6"],
  ["\uD835\uDFE9", "7"],
  ["\uD835\uDFEA", "8"],
  ["\uD835\uDFEB", "9"],
  ["\uD835\uDFEC", "0"],
  ["\uD835\uDFED", "1"],
  ["\uD835\uDFEE", "2"],
  ["\uD835\uDFEF", "3"],
  ["\uD835\uDFF0", "4"],
  ["\uD835\uDFF1", "5"],
  ["\uD835\uDFF2", "6"],
  ["\uD835\uDFF3", "7"],
  ["\uD835\uDFF4", "8"],
  ["\uD835\uDFF5", "9"],
  ["\uD835\uDFF6", "0"],
  ["\uD835\uDFF7", "1"],
  ["\uD835\uDFF8", "2"],
  ["\uD835\uDFF9", "3"],
  ["\uD835\uDFFA", "4"],
  ["\uD835\uDFFB", "5"],
  ["\uD835\uDFFC", "6"],
  ["\uD835\uDFFD", "7"],
  ["\uD835\uDFFE", "8"],
  ["\uD835\uDFFF", "9"],
  ["\u2460", "1"],
  ["\u2461", "2"],
  ["\u2462", "3"],
  ["\u2463", "4"],
  ["\u2464", "5"],
  ["\u2465", "6"],
  ["\u2466", "7"],
  ["\u2467", "8"],
  ["\u2468", "9"],
  ["\u2469", "10"],
  ["\u246A", "11"],
  ["\u246B", "12"],
  ["\u246C", "13"],
  ["\u246D", "14"],
  ["\u246E", "15"],
  ["\u246F", "16"],
  ["\u2470", "17"],
  ["\u2471", "18"],
  ["\u2472", "19"],
  ["\u2473", "20"],
  ["\u2474", "1"],
  ["\u2475", "2"],
  ["\u2476", "3"],
  ["\u2477", "4"],
  ["\u2478", "5"],
  ["\u2479", "6"],
  ["\u247A", "7"],
  ["\u247B", "8"],
  ["\u247C", "9"],
  ["\u247D", "10"],
  ["\u247E", "11"],
  ["\u247F", "12"],
  ["\u2480", "13"],
  ["\u2481", "14"],
  ["\u2482", "15"],
  ["\u2483", "16"],
  ["\u2484", "17"],
  ["\u2485", "18"],
  ["\u2486", "19"],
  ["\u2487", "20"],
  ["\u2488", "1."],
  ["\u2489", "2."],
  ["\u248A", "3."],
  ["\u248B", "4."],
  ["\u248C", "5."],
  ["\u248D", "6."],
  ["\u248E", "7."],
  ["\u248F", "8."],
  ["\u2490", "9."],
  ["\u2491", "10."],
  ["\u2492", "11."],
  ["\u2493", "12."],
  ["\u2494", "13."],
  ["\u2495", "14."],
  ["\u2496", "15."],
  ["\u2497", "16."],
  ["\u2498", "17."],
  ["\u2499", "18."],
  ["\u249A", "19."],
  ["\u249B", "20."],
  ["\u24EA", "0"],
  ["\u24EB", "11"],
  ["\u24EC", "12"],
  ["\u24ED", "13"],
  ["\u24EE", "14"],
  ["\u24EF", "15"],
  ["\u24F0", "16"],
  ["\u24F1", "17"],
  ["\u24F2", "18"],
  ["\u24F3", "19"],
  ["\u24F4", "20"],
  ["\u24F5", "1"],
  ["\u24F6", "2"],
  ["\u24F7", "3"],
  ["\u24F8", "4"],
  ["\u24F9", "5"],
  ["\u24FA", "6"],
  ["\u24FB", "7"],
  ["\u24FC", "8"],
  ["\u24FD", "9"],
  ["\u24FE", "10"],
  ["\u24FF", "0"],
  ["\uD83D\uDE70", "&"],
  ["\uD83D\uDE71", "&"],
  ["\uD83D\uDE72", "&"],
  ["\uD83D\uDE73", "&"],
  ["\uD83D\uDE74", "&"],
  ["\uD83D\uDE75", "&"],
  ["\uD83D\uDE76", '"'],
  ["\uD83D\uDE77", '"'],
  ["\uD83D\uDE78", '"'],
  ["\u203D", "?!"],
  ["\uD83D\uDE79", "?!"],
  ["\uD83D\uDE7A", "?!"],
  ["\uD83D\uDE7B", "?!"],
  ["\uD83D\uDE7C", "/"],
  ["\uD83D\uDE7D", "\\"],
  ["\uD83D\uDF07", "AR"],
  ["\uD83D\uDF08", "V"],
  ["\uD83D\uDF09", "V"],
  ["\uD83D\uDF06", "VR"],
  ["\uD83D\uDF05", "VF"],
  ["\uD83D\uDF29", "2"],
  ["\uD83D\uDF2A", "5"],
  ["\uD83D\uDF61", "f"],
  ["\uD83D\uDF62", "W"],
  ["\uD83D\uDF63", "U"],
  ["\uD83D\uDF67", "V"],
  ["\uD83D\uDF68", "T"],
  ["\uD83D\uDF6A", "V"],
  ["\uD83D\uDF6B", "MB"],
  ["\uD83D\uDF6C", "VB"],
  ["\uD83D\uDF72", "3B"],
  ["\uD83D\uDF73", "3B"],
  ["\uD83D\uDCAF", "100"],
  ["\uD83D\uDD19", "BACK"],
  ["\uD83D\uDD1A", "END"],
  ["\uD83D\uDD1B", "ON!"],
  ["\uD83D\uDD1C", "SOON"],
  ["\uD83D\uDD1D", "TOP"],
  ["\uD83D\uDD1E", "18"],
  ["\uD83D\uDD24", "abc"],
  ["\uD83D\uDD20", "ABCD"],
  ["\uD83D\uDD21", "abcd"],
  ["\uD83D\uDD22", "1234"],
  ["\uD83D\uDD23", "T&@%"],
  ["#\uFE0F\u20E3", "#"],
  ["*\uFE0F\u20E3", "*"],
  ["0\uFE0F\u20E3", "0"],
  ["1\uFE0F\u20E3", "1"],
  ["2\uFE0F\u20E3", "2"],
  ["3\uFE0F\u20E3", "3"],
  ["4\uFE0F\u20E3", "4"],
  ["5\uFE0F\u20E3", "5"],
  ["6\uFE0F\u20E3", "6"],
  ["7\uFE0F\u20E3", "7"],
  ["8\uFE0F\u20E3", "8"],
  ["9\uFE0F\u20E3", "9"],
  ["\uD83D\uDD1F", "10"],
  ["\uD83C\uDD70\uFE0F", "A"],
  ["\uD83C\uDD71\uFE0F", "B"],
  ["\uD83C\uDD8E", "AB"],
  ["\uD83C\uDD91", "CL"],
  ["\uD83C\uDD7E\uFE0F", "O"],
  ["\uD83C\uDD7F", "P"],
  ["\uD83C\uDD98", "SOS"],
  ["\uD83C\uDD72", "C"],
  ["\uD83C\uDD73", "D"],
  ["\uD83C\uDD74", "E"],
  ["\uD83C\uDD75", "F"],
  ["\uD83C\uDD76", "G"],
  ["\uD83C\uDD77", "H"],
  ["\uD83C\uDD78", "I"],
  ["\uD83C\uDD79", "J"],
  ["\uD83C\uDD7A", "K"],
  ["\uD83C\uDD7B", "L"],
  ["\uD83C\uDD7C", "M"],
  ["\uD83C\uDD7D", "N"],
  ["\uD83C\uDD80", "Q"],
  ["\uD83C\uDD81", "R"],
  ["\uD83C\uDD82", "S"],
  ["\uD83C\uDD83", "T"],
  ["\uD83C\uDD84", "U"],
  ["\uD83C\uDD85", "V"],
  ["\uD83C\uDD86", "W"],
  ["\uD83C\uDD87", "X"],
  ["\uD83C\uDD88", "Y"],
  ["\uD83C\uDD89", "Z"]
];
var replacements_default = replacements;

// node_modules/@sindresorhus/transliterate/index.js
var doCustomReplacements = (string, replacements3) => {
  for (const [key, value] of replacements3) {
    string = string.replace(new RegExp(escapeStringRegexp(key), "g"), value);
  }
  return string;
};
function transliterate(string, options) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a string, got \`${typeof string}\``);
  }
  options = {
    customReplacements: [],
    ...options
  };
  const customReplacements = new Map([
    ...replacements_default,
    ...options.customReplacements
  ]);
  string = string.normalize();
  string = doCustomReplacements(string, customReplacements);
  string = string.normalize("NFD").replace(/\p{Diacritic}/gu, "").normalize();
  return string;
}

// node_modules/@sindresorhus/slugify/overridable-replacements.js
var overridableReplacements = [
  ["&", " and "],
  ["\uD83E\uDD84", " unicorn "],
  ["\u2665", " love "]
];
var overridable_replacements_default = overridableReplacements;

// node_modules/@sindresorhus/slugify/index.js
var decamelize = (string) => {
  return string.replace(/([A-Z]{2,})(\d+)/g, "$1 $2").replace(/([a-z\d]+)([A-Z]{2,})/g, "$1 $2").replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-rt-z\d]+)/g, "$1 $2");
};
var removeMootSeparators = (string, separator) => {
  const escapedSeparator = escapeStringRegexp(separator);
  return string.replace(new RegExp(`${escapedSeparator}{2,}`, "g"), separator).replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}\$`, "g"), "");
};
var buildPatternSlug = (options) => {
  let negationSetPattern = "a-z\\d";
  negationSetPattern += options.lowercase ? "" : "A-Z";
  if (options.preserveCharacters.length > 0) {
    for (const character of options.preserveCharacters) {
      if (character === options.separator) {
        throw new Error(`The separator character \`${options.separator}\` cannot be included in preserved characters: ${options.preserveCharacters}`);
      }
      negationSetPattern += escapeStringRegexp(character);
    }
  }
  return new RegExp(`[^${negationSetPattern}]+`, "g");
};
function slugify(string, options) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a string, got \`${typeof string}\``);
  }
  options = {
    separator: "-",
    lowercase: true,
    decamelize: true,
    customReplacements: [],
    preserveLeadingUnderscore: false,
    preserveTrailingDash: false,
    preserveCharacters: [],
    ...options
  };
  const shouldPrependUnderscore = options.preserveLeadingUnderscore && string.startsWith("_");
  const shouldAppendDash = options.preserveTrailingDash && string.endsWith("-");
  const customReplacements = new Map([
    ...overridable_replacements_default,
    ...options.customReplacements
  ]);
  string = transliterate(string, { customReplacements });
  if (options.decamelize) {
    string = decamelize(string);
  }
  const patternSlug = buildPatternSlug(options);
  if (options.lowercase) {
    string = string.toLowerCase();
  }
  string = string.replace(/([a-zA-Z\d]+)'([ts])(\s|$)/g, "$1$2$3");
  string = string.replace(patternSlug, options.separator);
  string = string.replace(/\\/g, "");
  if (options.separator) {
    string = removeMootSeparators(string, options.separator);
  }
  if (shouldPrependUnderscore) {
    string = `_${string}`;
  }
  if (shouldAppendDash) {
    string = `${string}-`;
  }
  return string;
}

// src/plugin/resolve.ts
import {basename, dirname as dirname2} from "node:path";
import ts from "typescript";
import {normalizePath as normalizePath3} from "vite";
var serverScriptPattern = /^\+server\.(js|ts)$/;
var pageComponentPattern = /^\+page(@.*?)?\.svelte$/;
var pageScriptPattern = /^\+page\.(js|ts)$/;
var pageServerScriptPattern = /^\+page\.server\.(js|ts)$/;
var getRouteId = (routesDirRelativePath) => normalizePath3(dirname2(`/${routesDirRelativePath}`));
var getRouteKey = (routeId) => routeId === "/" ? "_ROOT" : slugify(routeId, { separator: "_" });
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
