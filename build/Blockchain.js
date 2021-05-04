"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bitcoinMessage = require("bitcoinjs-message");
const Block_1 = require("./Block");
const Message_1 = require("./Message");
const SubmitStarError_1 = require("./SubmitStarError");
const control_1 = require("./control");
class Blockchain {
    constructor() {
        this.chain = [];
    }
    /**
     * Initializes Blockchain with a genesis block
     * Async constructors are not supported
     */
    static async create() {
        const genesis = new Block_1.default({ data: 'Genesis Block' });
        const blockChain = new Blockchain();
        await blockChain._addBlock(genesis);
        return blockChain;
    }
    async _addBlock(block) {
        // update height, time, & prev hash prior to setting hash
        block.height = this.chain.length;
        block.time = Date.now();
        if (block.height > 0)
            block.previousBlockHash = this.chain[block.height - 1].hash;
        block.hash = await block.computeHash();
        this.chain.push(block);
        // validate the chain
        const errors = await this.validateChain();
        if (errors.length > 0)
            throw new Error('chain validation failed');
    }
    /** O(1) */
    async getBlockByHeight(height) {
        // JS doesn't throw on out of bounds, returns undefined
        return this.chain[height];
    }
    /** O(n) */
    async getBlockByHash(hash) {
        return this.chain.find(block => block.hash === hash);
    }
    async requestMessageOwnershipVerification(address) {
        return { message: Message_1.default.create(address).toString() };
    }
    async validateChain() {
        const [genesis, ...tail] = this.chain;
        const [errors, _] = await tail.reduce(async (acc, block, i) => {
            const [errors, previousBlock] = await acc;
            if (await previousBlock.validate(block.previousBlockHash))
                return [errors, block];
            else
                return [errors.concat(`Invalid block at ${i}`), block];
        }, Promise.resolve([[], genesis]));
        // last block can't really validate itself as nothing follows but we will just use its saved hash for now
        if (this.chain.length > 0 && !(await this.chain[this.chain.length - 1].validate()))
            return errors.concat(`Invalid block at ${this.chain.length - 1}`);
        else
            return errors;
    }
    /**
     * This throws SubmitStarError which is safe to present as a JSON response
     * @throws SubmitStarError */
    async submitStar({ address, message, signature, star }) {
        return await (async (message) => {
            // make sure message is legit
            if (!bitcoinMessage.verify(message.toString(), address, signature))
                throw new SubmitStarError_1.default('Failed to verify message');
            // make sure its not expired
            const ellapsed = Date.now() - message.timestamp;
            const FiveMinutes = 5 * 60_000;
            if (ellapsed >= FiveMinutes)
                throw new SubmitStarError_1.default('Message expired');
            // create new block
            const block = new Block_1.default({ owner: address, star });
            await this._addBlock(block);
            return block;
        })(control_1.getOrThrow(Message_1.default.decoder(address).decode(message), new SubmitStarError_1.default('Invalid message')));
    }
    /** @throws Error */
    async getStarsByWalletAddress(address) {
        const [_genesis, ...tail] = this.chain;
        const all = await Promise.all(tail.map(block => block.getBData()));
        return all.filter(data => data.owner === address);
    }
}
exports.default = Blockchain;
