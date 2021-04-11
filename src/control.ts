import { Either, isLeft } from 'fp-ts/Either';

/** unwraps right side or throws err
 * @throws E
 */
export function getOrThrow<A, B, E>(m: Either<A, B>, err: E): B {
    if (isLeft(m)) throw err;
    return m.right;
}