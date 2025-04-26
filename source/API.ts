import Router, { RouterOptions } from '@koa/router';
import Koa, { Middleware } from 'koa';

export function withKoa<S, T>(...middlewares: Middleware<S, T>[]) {
    const app = new Koa();

    for (const middleware of middlewares) app.use(middleware);

    return app.callback();
}

export const pageApiRouteOf = (path: string) =>
    path
        .match(/pages(\/api\/.+)\.(j|t)s/)?.[1]
        ?.split('/[')[0]
        ?.replace(/\/index$/, '');

export const createRouter = (moduleURI: string, option?: RouterOptions) =>
    new Router({ ...option, prefix: pageApiRouteOf(moduleURI) });

export const withKoaRouter = (router: Router, ...middlewares: Middleware[]) =>
    withKoa(router.routes(), router.allowedMethods(), ...middlewares);
