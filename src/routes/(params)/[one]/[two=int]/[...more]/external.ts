import { json, type RequestHandler } from '@sveltejs/kit';

export const someFunction = (() => json({})) satisfies RequestHandler;

export const OPTIONS = someFunction;
