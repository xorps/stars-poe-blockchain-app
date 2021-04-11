import * as bitcoinMessage from 'bitcoinjs-message';
import Block from './Block';
import { Star } from './Star';
import Message from './Message';
import SubmitStarError from './SubmitStarError';
import { getOrThrow } from './control';

export default class Blockchain {
    private chain: Array<Block> = [];

    private constructor() {}

    /**
     * Initializes Blockchain with a genesis block
     * Async constructors are not supported
     */
    public static async create(): Promise<Blockchain> {
        const genesis = new Block({data: 'Genesis Block'});
        const blockChain = new Blockchain();
        await blockChain._addBlock(genesis);
        return blockChain;
    }

    private async _addBlock(block: Block): Promise<void> {
        // update height, time, & prev hash prior to setting hash
        block.height = this.chain.length;
        block.time = Date.now();
        if (block.height > 0) block.previousBlockHash = this.chain[block.height - 1].hash!;
        block.hash = await block.computeHash();
        this.chain.push(block);
    }
   
    /** O(1) */
    public async getBlockByHeight(height: number): Promise<Block | undefined> {
        // JS doesn't throw on out of bounds, returns undefined
        return this.chain[height];
    }

    /** O(n) */
    public async getBlockByHash(hash: string): Promise<Block | undefined> {
        return this.chain.find(block => block.hash === hash);
    }

    public async requestMessageOwnershipVerification(address: string): Promise<{message: string}> {
        return {message: Message.create(address).toString()};
    }

    public async validateChain(): Promise<string[]> {
        const [genesis, ...tail] = this.chain;
        const [errors, _] = await tail.reduce<Promise<[string[], Block]>>(async (acc, block, i) => {
            const [errors, previousBlock] = await acc;
            if (await previousBlock.validate(block.previousBlockHash!)) return [errors, block];
            else return [errors.concat(`Invalid block at ${i}`), block];
        }, Promise.resolve([[], genesis]));
        // last block can't really validate itself as nothing follows but we will just use its saved hash for now
        if (this.chain.length > 0 && !(await this.chain[this.chain.length - 1].validate())) return errors.concat(`Invalid block at ${this.chain.length - 1}`);
        else return errors;
    }

    /**
     * This throws SubmitStarError which is safe to present as a JSON response 
     * @throws SubmitStarError */
    public async submitStar({address, message, signature, star}: {address: string; message: string; signature: string; star: Star}): Promise<Block> {
        return await (async (message: Message) => {
            // make sure message is legit
            if (!bitcoinMessage.verify(message.toString(), address, signature)) throw new SubmitStarError('Failed to verify message');
            // make sure its not expired
            const ellapsed = Date.now() - message.timestamp;
            const FiveMinutes = 5 * 60_000;
            if (ellapsed >= FiveMinutes) throw new SubmitStarError('Message expired');
            // create new block
            const block = new Block({owner: address, star});
            await this._addBlock(block);
            return block;
        })(getOrThrow(Message.decoder(address).decode(message), new SubmitStarError('Invalid message')));
    }

    /** @throws Error */
    public async getStarsByWalletAddress(address: string): Promise<Array<{owner: string; star: Star}>> {
        const [_genesis, ...tail] = this.chain;
        const all = await Promise.all(tail.map(block => block.getBData()));
        return all.filter(data => data.owner === address);
    }
}