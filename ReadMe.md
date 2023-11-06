# Next SSR middleware

[Koa][1]-like middlewares for [Next.js][2] **Server Side Rendering**

[![NPM Dependency](https://img.shields.io/librariesio/github/idea2app/Next-SSR-middleware.svg)][3]
[![CI & CD](https://github.com/idea2app/Next-SSR-middleware/actions/workflows/main.yml/badge.svg)][4]

[![NPM](https://nodei.co/npm/next-ssr-middleware.png?downloads=true&downloadRank=true&stars=true)][5]

## Usage

### `pages/user/[id].tsx`

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

## Cases

1. https://github.com/idea2app/Next-Bootstrap-ts

[1]: https://koajs.com/
[2]: https://nextjs.org/
[3]: https://libraries.io/npm/next-ssr-middleware
[4]: https://github.com/idea2app/Next-SSR-middleware/actions/workflows/main.yml
[5]: https://nodei.co/npm/next-ssr-middleware/
