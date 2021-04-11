import * as D from 'io-ts/Decoder';
import { pipe } from 'fp-ts/Function';

export default class Message {
    private constructor(public readonly walletAddress: string, public readonly timestamp: number) {}

    public static create(walletAddress: string): Message {
        return new Message(walletAddress, Date.now());
    }

    public static decoder(expectedAddress: string): D.Decoder<unknown, Message> {
        return pipe(D.string, D.parse(s => {
            const result = /^(\w+):(\d+):starRegistry$/[Symbol.match](s);
            if (result === null) return D.failure(s, 'Mesage failed to parse');
            const [_, address, timestampString] = result;
            if (address !== expectedAddress) return D.failure(s, 'Address does not match');
            const timestamp = Number(timestampString);
            if (isNaN(timestamp)) return D.failure(s, 'Message failed to convert timestamp to number');
            return D.success(new Message(address, timestamp));
        }));
    }

    public toString(): string {
        return `${this.walletAddress}:${this.timestamp}:starRegistry`;
    }
}