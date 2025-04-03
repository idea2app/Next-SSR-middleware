# Next SSR middleware

[Koa][1]-like middlewares for [Next.js][2] **Server Side Rendering**

[![NPM Dependency](https://img.shields.io/librariesio/github/idea2app/Next-SSR-middleware.svg)][3]
[![CI & CD](https://github.com/idea2app/Next-SSR-middleware/actions/workflows/main.yml/badge.svg)][4]

[![NPM](https://nodei.co/npm/next-ssr-middleware.png?downloads=true&downloadRank=true&stars=true)][5]

## Versions

|    SemVer    |    status    |  Next.js  |    MobX     | [MobX i18n][6] |
| :----------: | :----------: | :-------: | :---------: | :------------: |
|   `>=0.9`    | ✅developing |  `>=15`   |  `>=6.11`   |    `>=0.5`     |
| `>=0.7 <0.9` | ❌deprecated | `>=9 <15` |  `>=6.11`   |    `>=0.5`     |
|    `<0.7`    | ❌deprecated | `>=9 <15` | `>=4 <6.11` |     `<0.5`     |

## Middlewares

1. Router
2. Error logger
3. JWT verifier
4. Props cache
5. i18n loader
6. OAuth 2 signer (with common providers)
    1. GitHub

## Usage

### Page router

#### `pages/user/[id].tsx`

```tsx
import {
    JWTProps,
    RouterProps,
    jwtVerifier,
    cache,
    errorLogger,
    router,
    translator
} from 'next-ssr-middleware';

import i18n from '../../model/Translation';
import { User, UserModel } from '../../model/User';

type UserDetailPageProps = User & JWTProps & RouterProps;

export const getServerSideProps = compose<{ id: string }, UserDetailPageProps>(
    jwtVerifier(), // set `JWT_SECRET` in `.env.local` first
    cache(),
    errorLogger,
    router,
    translator(i18n),
    async ({ params }) => {
        const props = await new UserModel().getOne(params!.id);

        return { notFound: !props, props };
    }
);

export default function UserDetailPage({
    jwtPayload,
    route,
    name,
    summary
}: UserDetailPageProps) {
    return (
        <>
            <h1>
                {name} - {route.params!.id}
            </h1>
            <p>{summary}</p>
        </>
    );
}
```

### App router

#### `middleware.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { parseHeaders } from 'next-ssr-middleware';

export const config = {
    // Matcher ignoring `/_next/`, `/api/` & icons
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|apple-icon|icon).*)'
    ]
};
export const middleware = ({ headers }: NextRequest) =>
    NextResponse.next({ headers: parseHeaders(headers) });
```

#### `app/page.tsx`

```tsx
import { compose, withMiddleware, ServerProps } from 'next-ssr-middleware';

const getServerSideProps = compose(async () => {
    const props = await (
        await fetch('https://api.github.com/orgs/idea2app')
    ).json();

    return { props };
});

const HomePage = withMiddleware(getServerSideProps, Home);

export default HomePage;

async function Home({ params, searchParams, ...props }: ServerProps) {
    return (
        <>
            <h1>Home</h1>
            <pre>{JSON.stringify(props, null, 4)}</pre>
        </>
    );
}
```

## Cases

1. https://github.com/idea2app/Next-Bootstrap-ts
2. https://github.com/kaiyuanshe/kaiyuanshe.github.io
3. https://github.com/kaiyuanshe/OpenHackathon-Web
4. https://github.com/kaiyuanshe/OSS-toolbox

[1]: https://koajs.com/
[2]: https://nextjs.org/
[3]: https://libraries.io/npm/next-ssr-middleware
[4]: https://github.com/idea2app/Next-SSR-middleware/actions/workflows/main.yml
[5]: https://nodei.co/npm/next-ssr-middleware/
[6]: https://github.com/idea2app/MobX-i18n
