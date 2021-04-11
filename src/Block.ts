import * as t from 'io-ts';
import { hex2ascii } from 'hex2ascii';
import sha256 from './sha256';
import { Star } from './Star';
import { getOrThrow } from './control';

/** 
 * This class holds a model for a "Block" in our "Blockchain"
 * Keep in mind, this block may not be valid or added to a blockchain.
 * The blockchain class is free to mutate properties on this class.
 */
export default class Block {
    /** Hash of this block. This is set by Blockchain. */
    public hash?: string;

    /** Height of this block in the blockchain, basically an indice, set by Blockchain */
    public height?: number;

    /** hex encoded json string -- Data of this block. Initialized by constructor. */
    public body: string;

    /** Timestamp of block creation, this is set by Blockchain */
    public time?: number;

    /** Hash of previous block. This is set by Blockchain. */
    public previousBlockHash: string | null = null;

    public constructor(data: {data: string} | {owner: string; star: Star}) {
        this.body = Buffer.from(JSON.stringify(data)).toString('hex');
    }

    public async computeHash(): Promise<string> {
        const {height, body, time, previousBlockHash} = this;
        const json = JSON.stringify({height, body, time, previousBlockHash});
        return sha256(json);
    }

    public async validate(expectedHash?: string): Promise<boolean> {
        const hash = expectedHash !== undefined ? expectedHash : this.hash!;
        return hash === await this.computeHash();
    }

    /** @throws Error an unrecoverable internal error */
    public async getBData(): Promise<{owner: string; star: Star}> {
        if (this.height! === 0) throw new Error('getBData() called on Genesis Block');
        const result = t.type({owner: t.string, star: Star}).decode(JSON.parse(hex2ascii(this.body)));
        return getOrThrow(result, new Error(`getBData() unrecognizable data: ${result}`));
    }
}