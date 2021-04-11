import * as t from 'io-ts';

export const Star = t.type({
    dec: t.string,
    ra: t.string,
    story: t.string,
});

export type Star = t.TypeOf<typeof Star>;