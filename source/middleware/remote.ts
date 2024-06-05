import { buildURLData } from 'web-utility';

import { DataObject, Middleware } from '../compose';

export type OAuth2Ticket = {
    code: string;
    state?: string;
    [key: string]: string;
};

export interface OAuth2Option {
    signInURL: (pageURL: string) => string;
    accessToken: (ticket: OAuth2Ticket) => Promise<string>;
    userProfile: (token: string) => Promise<DataObject>;
    tokenKey?: string;
}

export interface OAuth2Props<T extends DataObject> {
    token: string;
    user: T;
}

const Host = process.env.VERCEL_URL || 'http://127.0.0.1:3000';

export function oauth2Signer<I extends DataObject, O extends DataObject = {}>({
    signInURL,
    accessToken,
    userProfile,
    tokenKey = 'token'
}: OAuth2Option): Middleware<I, O> {
    return async ({ req: { url, headers, cookies }, query, res }, next) => {
        const token = cookies[tokenKey];
        const pageURL = new URL(url || '/', headers['origin'] || Host) + '';

        if (query.code) {
            const token = await accessToken(query as OAuth2Ticket);

            res.setHeader('Set-Cookie', `token=${token}; Path=/`);

            return {
                redirect: {
                    destination: pageURL.split('?')[0],
                    permanent: false
                },
                props: {} as O
            };
        }
        if (token)
            try {
                const user = await userProfile(token),
                    data = await next();
                const props =
                    'props' in data
                        ? { ...data.props, token, user }
                        : ({} as O);

                return { ...data, props };
            } catch {}

        return {
            redirect: {
                destination: signInURL(pageURL + ''),
                permanent: false
            },
            props: {} as O
        };
    };
}

/**
 * @see {@link https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow}
 */
export interface GitHubOAuthOption
    extends Record<'client_id' | 'client_secret', string> {
    scopes?: string[];
    login?: string;
    allow_signup?: boolean;
}

export function githubOAuth2<I extends DataObject, O extends DataObject = {}>({
    client_id,
    client_secret,
    scopes,
    allow_signup = true
}: GitHubOAuthOption) {
    return oauth2Signer<I, O>({
        signInURL: redirect_uri =>
            `https://github.com/login/oauth/authorize?${buildURLData({
                client_id,
                scope: scopes?.join(' '),
                allow_signup,
                redirect_uri
            })}`,
        accessToken: async ({ code }) => {
            const response = await fetch(
                'https://github.com/login/oauth/access_token',
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ client_id, client_secret, code })
                }
            );
            const { error, access_token } = await response.json();

            if (error) throw new URIError(error);

            return access_token;
        },
        userProfile: async token => {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });
            if (response.status < 300) return response.json();

            throw new URIError('Invalid GitHub access token');
        }
    });
}
