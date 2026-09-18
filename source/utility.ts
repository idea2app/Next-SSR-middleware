const {
    NODE_ENV,
    VERCEL_ENV = NODE_ENV,
    VERCEL_URL,
    VERCEL_PROJECT_PRODUCTION_URL
} = process.env;

export const RemoteDomain =
    VERCEL_ENV === 'production' ? VERCEL_PROJECT_PRODUCTION_URL : VERCEL_URL;

export const CurrentHost = RemoteDomain
    ? `https://${RemoteDomain}`
    : 'http://localhost:3000';
