import slugify from '@sindresorhus/slugify';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts, { type Identifier } from 'typescript';
import type { ActionRoute, PageRoute, PathParam, Route, ServerRoute } from './types.js';

export const isServerEndpointFile = (file: string) => /\+server\.(j|t)s$/.test(file);

export const isPageFile = (file: string) => /\+page(@.*?)?\.svelte$/.test(file);

const isPageServerFile = (file: string) => /\+page\.server\.(j|t)s$/.test(file);

export const getRouteId = (routesDir: string, file: string) => relative(routesDir, dirname(file));

const getRouteKey = (routeId: string) => slugify(routeId, { separator: '_' });

const getRoutePathParams = (routeId: string) => {
  if (/\[\[.+\]\]/.test(routeId)) {
    throw new Error('Optional path parameters not supported yet!');
  }

  const pathParams: PathParam[] = [];

  for (const [, param, matcher] of routeId.matchAll(/\[(.+?)(?:=(.+))?\]/g)) {
    if (param.startsWith('...')) {
      pathParams.push({ name: param.slice(3), multi: true });
    } else if (matcher) {
      pathParams.push({ name: param, matcher });
    } else {
      pathParams.push({ name: param });
    }
  }

  return pathParams;
};

export const resolveRouteInfo = (routesDir: string, file: string, routes: Route[]) => {
  const routeId = getRouteId(routesDir, file);
  const key = getRouteKey(routeId);
  const pathParams = getRoutePathParams(routeId);

  if (isServerEndpointFile(file)) {
    const sourceContents = readFileSync(file, { encoding: 'utf8' });
    const source = ts.createSourceFile(
      'x.ts',
      sourceContents,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    );

    const methods: string[] = [];

    findExports(source, (name) => {
      if (name.toUpperCase() === name) {
        methods.push(name);
      }
    });

    const existing = routes.find((r): r is ServerRoute => r.type === 'SERVER' && r.routeId === routeId);

    if (!existing) {
      routes.push({
        type: 'SERVER',
        routeId,
        key,
        pathParams,
        methods,
      });
    } else {
      existing.pathParams = pathParams;
      existing.methods = methods;
    }

    return;
  }

  if (isPageFile(file)) {
    const existing = routes.find((r): r is PageRoute => r.type === 'PAGE' && r.routeId === routeId);

    if (!existing) {
      routes.push({
        type: 'PAGE',
        routeId,
        key,
        pathParams,
      });
    } else {
      existing.pathParams = pathParams;
    }

    // Handle the page server file next, if existing.
    file = resolve(dirname(file), '+page.server.js');
    if (!existsSync(file)) {
      file = resolve(dirname(file), '+page.server.ts');
    }
    if (!existsSync(file)) {
      return;
    }
  }

  if (isPageServerFile(file)) {
    const sourceContents = readFileSync(file, { encoding: 'utf8' });
    const source = ts.createSourceFile(
      'x.ts',
      sourceContents,
      ts.ScriptTarget.Latest,
      false,
      ts.ScriptKind.TS,
    );

    let route = routes.find((r): r is ActionRoute => r.type === 'ACTION' && r.routeId === routeId);
    if (!route) {
      route = {
        type: 'ACTION',
        routeId,
        key,
        pathParams,
        names: [],
      };
      routes.push(route);
    } else {
      route.pathParams = pathParams;
      route.names = [];
    }

    const realRoute = route;

    findExports(source, (name, node) => {
      if (name === 'actions') {
        if (ts.isVariableDeclaration(node) && node.initializer) {
          if (ts.isObjectLiteralExpression(node.initializer)) {
            node.initializer.properties.forEach((prop) => {
              if (ts.isMethodDeclaration(prop)) {
                realRoute.names.push((prop.name as Identifier).text);
              } else if (ts.isPropertyAssignment(prop)) {
                realRoute.names.push((prop.name as Identifier).text);
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
  }
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
