import BodyParser from '@koa/bodyparser';
import {
    Router,
    RouterOptions,
    RouterContext,
    RouterInstance
} from '@koa/router';
import Koa, { Middleware } from 'koa';

export type KoaOption = ConstructorParameters<typeof Koa>[0];

export type KoaCallback = ReturnType<(typeof Koa)['prototype']['callback']>;

export function withKoa<S, C>(...middlewares: Middleware<S, C>[]): KoaCallback;
export function withKoa<S, C>(
    option: KoaOption,
    ...middlewares: Middleware<S, C>[]
): KoaCallback;
export function withKoa<S, C>(...parameters: any[]) {
    let option: KoaOption | undefined;
    let middlewares: Middleware<S, C>[] = [];

    if (typeof parameters[0] === 'function') {
        option = undefined;
        middlewares = parameters;
    } else [option, ...middlewares] = parameters;

    const app = new Koa(option).use(BodyParser());

    for (const middleware of middlewares) app.use(middleware);

    return app.callback();
}

export const pageApiRouteOf = (path: string) =>
    decodeURI(path)
        .match(/pages(\/api\/.+)\.(j|t)s/)?.[1]
        ?.split('/[')[0]
        ?.replace(/\/index$/, '');

export const createKoaRouter = <S, C extends RouterContext<S>>(
    moduleURI: string,
    option?: RouterOptions
) => new Router<S, C>({ ...option, prefix: pageApiRouteOf(moduleURI) });

export function withKoaRouter<S, C extends RouterContext<S>>(
    router: RouterInstance<S, C>,
    ...middlewares: Middleware<S, C>[]
): KoaCallback;
export function withKoaRouter<S, C extends RouterContext<S>>(
    option: KoaOption,
    router: RouterInstance<S, C>,
    ...middlewares: Middleware<S, C>[]
): KoaCallback;
export function withKoaRouter<S, C extends RouterContext<S>>(
    ...parameters: any[]
) {
    let option: KoaOption | undefined;
    let router: RouterInstance<S, C>;
    let middlewares: Middleware<S, C>[] = [];

    if (!parameters[1] || typeof parameters[1] === 'function')
        [router, ...middlewares] = parameters;
    else [option, router, ...middlewares] = parameters;

    return withKoa(
        option,
        router.routes(),
        router.allowedMethods(),
        ...middlewares
    );
}
