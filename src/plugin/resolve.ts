import slugify from '@sindresorhus/slugify';
import { basename, dirname } from 'node:path';
import ts, { type Identifier } from 'typescript';
import { normalizePath } from 'vite';
import type { ActionRoute, PageRoute, PathParameter, Route, ServerRoute } from './types.js';

const serverScriptPattern = /^\+server\.(js|ts)$/;
const pageComponentPattern = /^\+page(@.*?)?\.svelte$/;
const pageScriptPattern = /^\+page\.(js|ts)$/;
const pageServerScriptPattern = /^\+page\.server\.(js|ts)$/;

export const getRouteId = (routesDirRelativePath: string) =>
  // Prepending the slash here correctly handles `dirname('/')` and thus root routes.
  normalizePath(dirname(`/${routesDirRelativePath}`));

const getRouteKey = (routeId: string) => (routeId === '/' ? '_ROOT' : slugify(routeId, { separator: '_' }));

const makeValidIdentifier = (name: string) => {
  if (/^[0-9-]/.test(name)) {
    return `_${name}`;
  }
  return name;
};

const getRoutePathParams = (routeId: string) => {
  if (/\[\[.+\]\]/.test(routeId)) {
    throw new Error('Optional path parameters are not supported yet!');
  }

  const pathParams: PathParameter[] = [];

  for (let [rawInRoute, param, matcher] of routeId.matchAll(/\[(.+?)(?:=(.+?))?\]/g)) {
    if (!param) {
      continue;
    }

    let type = 'string';
    let multi = false;

    if (param.startsWith('...')) {
      param = param.slice(3);
      type = 'string | string[]';
      multi = true;
    } else if (matcher) {
      type = `Param_${matcher}`;
    }

    pathParams.push({
      name: makeValidIdentifier(param),
      type,
      rawInRoute,
      matcher,
      multi,
    });
  }

  return pathParams;
};

type FileType = NonNullable<ReturnType<typeof getFileTypeFromFileName>>;

export const getFileTypeFromFileName = (
  fileName: string,
): 'SERVER_SCRIPT' | 'PAGE_COMPONENT' | 'PAGE_SCRIPT' | 'PAGE_SERVER_SCRIPT' | null => {
  fileName = basename(fileName);

  if (serverScriptPattern.test(fileName)) {
    return 'SERVER_SCRIPT';
  }

  if (pageComponentPattern.test(fileName)) {
    return 'PAGE_COMPONENT';
  }

  if (pageScriptPattern.test(fileName)) {
    return 'PAGE_SCRIPT';
  }

  if (pageServerScriptPattern.test(fileName)) {
    return 'PAGE_SERVER_SCRIPT';
  }

  return null;
};

export const getRouteTypeFromFileType = (fileType: FileType): Route['type'] => {
  if (fileType === 'SERVER_SCRIPT') {
    return 'SERVER';
  }

  if (fileType === 'PAGE_COMPONENT' || fileType === 'PAGE_SCRIPT') {
    return 'PAGE';
  }

  if (fileType === 'PAGE_SERVER_SCRIPT') {
    return 'ACTION';
  }

  throw new Error(`Unexpected route type: '${fileType}'`);
};

export const resolveRouteInfo = (
  routeId: string,
  fileType: FileType,
  getSource: () => string,
  routes: Route[],
) => {
  const key = getRouteKey(routeId);
  const pathParams = getRoutePathParams(routeId);
  const type = getRouteTypeFromFileType(fileType);

  function getExisting(type: 'SERVER'): ServerRoute | undefined;
  function getExisting(type: 'PAGE'): PageRoute | undefined;
  function getExisting(type: 'ACTION'): ActionRoute | undefined;
  function getExisting(type: Route['type']): Route | undefined {
    return routes.find((r) => r.type === type && r.routeId === routeId);
  }

  if (type === 'SERVER') {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams,
        methods: [],
      };
      routes.push(route);
    }

    route.methods = extractMethodsFromServerEndpointCode(getSource()).sort();

    return;
  }

  if (type === 'PAGE') {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams,
      };
      routes.push(route);
    }

    return;
  }

  if (type === 'ACTION') {
    let route = getExisting(type);
    if (!route) {
      route = {
        type,
        routeId,
        key,
        pathParams,
        names: [],
      };
      routes.push(route);
    }

    route.names = extractActionNamesFromPageServerCode(getSource()).sort();

    return;
  }

  throw new Error(`Unexpected route type: '${type}'`);
};

const extractMethodsFromServerEndpointCode = (code: string): string[] => {
  const source = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

  const methods: string[] = [];

  findExports(source, (name) => {
    if (name.toUpperCase() === name) {
      methods.push(name);
    }
  });

  return methods;
};

const extractActionNamesFromPageServerCode = (code: string): string[] => {
  const source = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

  const names: string[] = [];

  findExports(source, (name, node) => {
    if (name === 'actions') {
      forEachActionsProperty(node, (prop) => {
        if (ts.isMethodDeclaration(prop)) {
          names.push((prop.name as Identifier).text);
        } else if (ts.isPropertyAssignment(prop)) {
          names.push((prop.name as Identifier).text);
        } else if (ts.isShorthandPropertyAssignment(prop)) {
          names.push(prop.name.text);
        } else {
          throw new Error(`Unhandled action property kind: ${ts.SyntaxKind[prop.kind]}`);
        }
      });
    }
  });

  return names;
};

const findExports = (node: ts.Node, handleExport: (exportName: string, node: ts.Node) => void) => {
  node.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      if (node.modifiers?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
        node.declarationList.declarations.forEach((decl) =>
          handleExport((decl.name as ts.Identifier).text, decl),
        );
      }
    } else if (ts.isExportDeclaration(node)) {
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach((spec) => handleExport(spec.name.text, spec));
      }
    }

    node.forEachChild((node) => findExports(node, handleExport));
  });
};

const forEachActionsProperty = (node: ts.Node, callback: (prop: ts.ObjectLiteralElementLike) => void) => {
  if (ts.isVariableDeclaration(node) && node.initializer) {
    forEachActionsProperty(node.initializer, callback);
  } else if (ts.isSatisfiesExpression(node)) {
    forEachActionsProperty(node.expression, callback);
  } else if (ts.isObjectLiteralExpression(node)) {
    node.properties.forEach(callback);
  }
};
