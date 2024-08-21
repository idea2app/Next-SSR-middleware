import { JwtPayload, VerifyOptions, verify } from 'jsonwebtoken';
import { HTTPError } from 'koajax';
import { TranslationModel, parseLanguageHeader } from 'mobx-i18n';
import { GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { Day, Second } from 'web-utility';

import { DataObject, Middleware } from '../compose';

export async function errorLogger<
    I extends DataObject,
    O extends DataObject = {}
>(
    context: GetServerSidePropsContext<I>,
    next: () => Promise<GetServerSidePropsResult<O>>
): Promise<GetServerSidePropsResult<O>> {
    try {
        return await next();
    } catch (error) {
        console.error(error);

        const { status } = (error as HTTPError).response;

        if (status === 404) return { notFound: true, props: {} as O };

        throw error;
    }
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

export interface JWTProps<T extends DataObject = {}> {
    jwtPayload?: JwtPayload & T;
}

export function jwtVerifier<I extends DataObject, O extends DataObject = {}>(
    tokenKey = 'token',
    secretKey = 'JWT_SECRET',
    options: VerifyOptions = {}
): Middleware<I, O & JWTProps> {
    return async ({ req: { url, cookies } }, next) => {
        const token = cookies[tokenKey];

        try {
            var jwtPayload = verify(token, process.env[secretKey], options);
        } catch (error) {
            console.error(url, error);
        }
        const data = await next();

        if ('props' in data && jwtPayload)
            data.props['jwtPayload'] = jwtPayload;

        return data;
    };
}

interface AsyncCache {
    expiredAt?: number;
    data?: GetServerSidePropsResult<DataObject>;
    buffer?: Promise<GetServerSidePropsResult<DataObject>>;
}

const serverRenderCache: Record<string, AsyncCache> = {};

export function cache<I extends DataObject, O extends DataObject = {}>(
    oneInterval = 30 * Second,
    allInterval = Day
) {
    function cleanCache() {
        for (const [URI, { expiredAt }] of Object.entries(serverRenderCache))
            if (Date.now() - expiredAt > allInterval)
                delete serverRenderCache[URI];
    }

    return (async (context, next) => {
        const { resolvedUrl } = context;
        const cache = (serverRenderCache[resolvedUrl] ||= {}),
            title = `[SSR cache] ${resolvedUrl}`;
        const { data, expiredAt = 0 } = cache;

        if ((!data || expiredAt < Date.now()) && !cache.buffer) {
            console.time(title);

            cache.buffer = next()
                .then(data => {
                    cache.data = data;
                    cache.expiredAt = Date.now() + oneInterval;

                    console.log(cache);

                    return data;
                })
                .finally(() => {
                    delete cache.buffer;
                    cleanCache();

                    console.timeEnd(title);
                });
        }
        return data || cache.buffer;
    }) as Middleware<I, O>;
}

export function translator<I extends DataObject, O extends DataObject = {}>(
    i18n: TranslationModel<string, string>
): Middleware<I, O> {
    return async (
        { req: { headers, cookies } }: GetServerSidePropsContext<I>,
        next: () => Promise<GetServerSidePropsResult<O>>
    ) => {
        const { language = '' } = cookies,
            languages = parseLanguageHeader(headers['accept-language'] || '');

        await i18n.loadLanguages([language, ...languages].filter(Boolean));

        return next();
    };
}
