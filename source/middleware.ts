import { TranslationModel, parseLanguageHeader } from 'mobx-i18n';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { Second } from 'web-utility';
import { HTTPError } from 'koajax';

import { DataObject, Middleware } from './compose';

export async function errorLogger<
    I extends DataObject,
    O extends DataObject = {}
>(
    onNoFund?: (
        context: GetServerSidePropsContext<I>
    ) => GetServerSidePropsResult<O>
) {
    return (async (context, next) => {
        try {
            return await next();
        } catch (error) {
            console.error(error);

            const { status } = error as HTTPError;

            if (status === 404)
                return (
                    onNoFund?.(context) ?? { notFound: true, props: {} as O }
                );

            throw error;
        }
    }) as Middleware<I, O>;
}

export interface RouteProps<T extends ParsedUrlQuery = {}> {
    route: Pick<
        GetServerSidePropsContext<T>,
        'resolvedUrl' | 'params' | 'query' | 'locales'
    >;
}

export async function router<I extends DataObject, O extends DataObject = {}>(
    context: GetServerSidePropsContext<I>,
    next: () => Promise<GetServerSidePropsResult<O>>
) {
    const options = (await next()) || ({} as GetServerSidePropsResult<{}>),
        { resolvedUrl, params, query, locales } = context;

    return {
        ...options,
        props: {
            ...('props' in options ? options.props : {}),
            route: JSON.parse(
                JSON.stringify({ resolvedUrl, params, query, locales })
            )
        }
    } as GetServerSidePropsResult<RouteProps<I> & O>;
}

interface AsyncCache {
    expiredAt?: number;
    data?: GetServerSidePropsResult<DataObject>;
    buffer?: Promise<GetServerSidePropsResult<DataObject>>;
}

const serverRenderCache: Record<string, AsyncCache> = {};

export function cache<I extends DataObject, O extends DataObject = {}>(
    interval = 30 * Second
) {
    return (async (context, next) => {
        const { resolvedUrl } = context;
        const cache = (serverRenderCache[resolvedUrl] ||= {}),
            title = `[SSR cache] ${resolvedUrl}`;
        const { data, expiredAt = 0 } = cache;

        if ((!data || expiredAt < Date.now()) && !cache.buffer) {
            console.time(title);

            cache.buffer = next().then(data => {
                delete cache.buffer;
                cache.data = data;
                cache.expiredAt = Date.now() + interval;

                console.timeEnd(title);
                console.log(cache);

                return data;
            });
        }
        return data || cache.buffer;
    }) as Middleware<I, O>;
}

export function translator<I extends DataObject, O extends DataObject = {}>(
    i18n: TranslationModel<string, string>
): Middleware<I, O> {
    return async (
        context: GetServerSidePropsContext<I>,
        next: () => Promise<GetServerSidePropsResult<O>>
    ) => {
        const { language = '' } = context.req.cookies,
            languages = parseLanguageHeader(
                context.req.headers['accept-language'] || ''
            );
        await i18n.loadLanguages([language, ...languages].filter(Boolean));

        return next();
    };
}
