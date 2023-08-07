import {
    GetServerSideProps,
    GetServerSidePropsContext,
    GetServerSidePropsResult
} from 'next';

export type DataObject = Record<string, any>;

export type Middleware<I extends DataObject, O extends DataObject = {}> = (
    context: GetServerSidePropsContext<I>,
    next: () => Promise<GetServerSidePropsResult<O>>
) => Promise<GetServerSidePropsResult<O>>;

export function compose<
    I extends DataObject,
    O extends DataObject = {},
    F extends GetServerSideProps<O, I> = GetServerSideProps<O, I>
>(...middlewares: Middleware<I, O>[]) {
    return (context => {
        const [first, ...rest] = middlewares;

        const next = async () =>
            (await rest.shift()?.(context, next)) ||
            ({ props: {} } as GetServerSidePropsResult<O>);

        return first(context, next);
    }) as F;
}
