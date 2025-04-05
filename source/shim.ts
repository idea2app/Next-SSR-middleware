import { IncomingMessage, ServerResponse } from 'http';
import { NextApiRequestCookies } from 'next/dist/server/api-utils';
import { cookies, draftMode, headers } from 'next/headers';
import { permanentRedirect, redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import {
    GetServerSideProps,
    GetServerSidePropsContext,
    PreviewData
} from 'next/types';
import { ParsedUrlQuery } from 'querystring';
import type { ReactNode } from 'react';

/**
 * @see {@link https://www.propelauth.com/post/getting-url-in-next-server-components}
 */
export function patchHeaders(request: NextRequest) {
    const resolvedUrl = request.nextUrl + '',
        { locale, defaultLocale = '', domainLocale } = request.nextUrl,
        headers = new Headers(request.headers);
    const locales = domainLocale?.locales?.join(',') || locale;

    headers.set('x-resolved-url', resolvedUrl);
    headers.set('x-locale', locale);
    headers.set('x-locales', locales);
    headers.set('x-default-locale', defaultLocale);

    return headers;
}

export type ServerProps<
    I extends Record<string, string> = {},
    O extends object = {}
> = O & {
    params: Promise<I>;
    searchParams: Promise<ParsedUrlQuery>;
};

export type ServerComponent<
    I extends Record<string, string> = {},
    O extends object = {}
> = (props: ServerProps<I, O>) => Promise<ReactNode>;

export const withMiddleware =
    <I extends Record<string, string> = {}, O extends object = {}>(
        getServerSideProps: GetServerSideProps<O, I>,
        serverComponent: ServerComponent<I, O>
    ): ServerComponent<I> =>
    async ({ params, searchParams }) => {
        const resolvedParams = await params,
            resolvedSearchParams = await searchParams,
            header = await headers(),
            cookie = await cookies(),
            { isEnabled } = await draftMode();

        const url = header.get('x-resolved-url') || '',
            locale = header.get('x-locale') || '',
            locales = header.get('x-locales')?.split(',') || [],
            defaultLocale = header.get('x-default-locale') || '';
        const req = {
            url,
            headers: Object.fromEntries([...header]),
            cookies: Object.fromEntries(
                cookie.getAll().map(({ name, value }) => [name, value])
            )
        } as IncomingMessage & { cookies: NextApiRequestCookies };

        const context: GetServerSidePropsContext<I> = {
            req,
            res: {} as ServerResponse,
            params: resolvedParams as I,
            query: resolvedSearchParams,
            preview: false,
            previewData: {} as PreviewData,
            draftMode: isEnabled,
            resolvedUrl: url,
            locale,
            locales,
            defaultLocale
        };
        const result = await getServerSideProps(context);

        if ('redirect' in result) {
            const isPermanent =
                'statusCode' in result.redirect
                    ? result.redirect.statusCode === 308
                    : 'permanent' in result.redirect &&
                      result.redirect.permanent;
            const { destination } = result.redirect;

            if (isPermanent) permanentRedirect(destination);
            else redirect(destination);
        }
        if ('props' in result) {
            const props = await result.props;

            return serverComponent({ params, searchParams, ...props });
        }
    };
