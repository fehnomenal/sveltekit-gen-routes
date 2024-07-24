import slugify from '@sindresorhus/slugify';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import ts, { type Identifier } from 'typescript';
import { normalizePath } from 'vite';
import type { ActionRoute, PageRoute, PathParameter, Route, ServerRoute } from './types.js';

export const isServerEndpointFile = (file: string) => /\+server\.(js|ts)$/.test(file);

export const isPageFile = (file: string) =>
  /\+page(@.*?)?\.svelte$/.test(file) || /\+page\.(js|ts)$/.test(file);

export const isPageServerFile = (file: string) => /\+page\.server\.(js|ts)$/.test(file);

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

export const resolveRouteInfo = (routeId: string, file: string, routes: Route[]) => {
  const key = getRouteKey(routeId);
  const pathParams = getRoutePathParams(routeId);

  const getSource = () => readFileSync(file, { encoding: 'utf-8' });

  function getExisting(type: 'SERVER'): ServerRoute | undefined;
  function getExisting(type: 'PAGE'): PageRoute | undefined;
  function getExisting(type: 'ACTION'): ActionRoute | undefined;
  function getExisting(type: Route['type']): Route | undefined {
    return routes.find((r) => r.type === type && r.routeId === routeId);
  }

  if (isServerEndpointFile(file)) {
    let route = getExisting('SERVER');
    if (!route) {
      route = {
        type: 'SERVER',
        routeId,
        key,
        pathParams,
        methods: [],
      };
      routes.push(route);
    }

    route.methods = extractMethodsFromServerEndpointCode(getSource()).sort();
  }

  if (isPageFile(file)) {
    let route = getExisting('PAGE');
    if (!route) {
      route = {
        type: 'PAGE',
        routeId,
        key,
        pathParams,
      };
      routes.push(route);
    }
  }

  if (isPageServerFile(file)) {
    let route = getExisting('ACTION');
    if (!route) {
      route = {
        type: 'ACTION',
        routeId,
        key,
        pathParams,
        names: [],
      };
      routes.push(route);
    }

    route.names = extractActionNamesFromPageServerCode(getSource()).sort();
  }
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
      if (ts.isVariableDeclaration(node) && node.initializer) {
        if (ts.isObjectLiteralExpression(node.initializer)) {
          node.initializer.properties.forEach((prop) => {
            if (ts.isMethodDeclaration(prop)) {
              names.push((prop.name as Identifier).text);
            } else if (ts.isPropertyAssignment(prop)) {
              names.push((prop.name as Identifier).text);
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
