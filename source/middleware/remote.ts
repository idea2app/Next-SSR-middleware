import { buildURLData } from 'web-utility';

import { DataObject, Middleware } from '../compose';

export type OAuth2Ticket = {
    code: string;
    state: string;
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

const DOMAIN = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const Host = DOMAIN ? `https://${DOMAIN}` : 'http://localhost:3000';

export function oauth2Signer<I extends DataObject, O extends DataObject = {}>({
    signInURL,
    accessToken,
    userProfile,
    tokenKey = 'token'
}: OAuth2Option): Middleware<I, O> {
    return async ({ req: { url, headers }, query }, next) => {
        const token = query[tokenKey];
        const pageURL = new URL(url || '/', headers['origin'] || Host);

        if (query.code) {
            const token = await accessToken(query as OAuth2Ticket),
                { searchParams } = pageURL;

            searchParams.set(tokenKey, token);
            searchParams.delete('code');
            if (searchParams.get('state') === '') searchParams.delete('state');

            return {
                redirect: { destination: pageURL + '', permanent: false },
                props: {} as O
            };
        }
        if (token) {
            const user = await userProfile(token + ''),
                data = await next();
            const props =
                'props' in data ? { ...data.props, token, user } : ({} as O);

            return { ...data, props };
        }

        return {
            redirect: {
                destination: signInURL(pageURL + ''),
                permanent: false
            },
            props: {} as O
        };
    };
}

export type GitHubAPIOperation = 'admin' | 'write' | 'read' | 'delete';

export type GitHubOAuthScope =
    | `repo${'' | ':status' | '_deployment' | ':invite'}`
    | 'public_repo'
    | 'security_events'
    | `${Exclude<GitHubAPIOperation, 'delete'>}:${'repo_hook' | 'org' | 'public_key' | 'gpg_key'}`
    | 'admin:org_hook'
    | 'gist'
    | 'notifications'
    | `user${'' | ':email' | ':follow'}`
    | `read:${'user' | 'project'}`
    | 'project'
    | 'delete_repo'
    | `${Exclude<GitHubAPIOperation, 'admin'>}:packages`
    | 'codespace'
    | 'workflow';
/**
 * @see {@link https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#web-application-flow}
 */
export interface GitHubOAuthOption
    extends Partial<Record<'rootBaseURL' | 'apiBaseURL' | 'login', string>>,
        Record<'client_id' | 'client_secret', string> {
    scopes?: GitHubOAuthScope[];
    allow_signup?: boolean;
}

export function githubOAuth2<I extends DataObject, O extends DataObject = {}>({
    rootBaseURL = 'https://github.com',
    apiBaseURL = 'https://api.github.com',
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
                new URL('login/oauth/access_token', rootBaseURL),
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
            const response = await fetch(new URL('user', apiBaseURL), {
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
