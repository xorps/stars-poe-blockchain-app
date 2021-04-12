"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const t = require("io-ts");
const hex2ascii_1 = require("hex2ascii");
const sha256_1 = require("./sha256");
const Star_1 = require("./Star");
const control_1 = require("./control");
/**
 * This class holds a model for a "Block" in our "Blockchain"
 * Keep in mind, this block may not be valid or added to a blockchain.
 * The blockchain class is free to mutate properties on this class.
 */
class Block {
    constructor(data) {
        /** Hash of previous block. This is set by Blockchain. */
        this.previousBlockHash = null;
        this.body = Buffer.from(JSON.stringify(data)).toString('hex');
    }
    async computeHash() {
        const { height, body, time, previousBlockHash } = this;
        const json = JSON.stringify({ height, body, time, previousBlockHash });
        return sha256_1.default(json);
    }
    async validate(expectedHash) {
        const hash = expectedHash !== undefined ? expectedHash : this.hash;
        return hash === await this.computeHash();
    }
    /** @throws Error an unrecoverable internal error */
    async getBData() {
        if (this.height === 0)
            throw new Error('getBData() called on Genesis Block');
        const result = t.type({ owner: t.string, star: Star_1.Star }).decode(JSON.parse(hex2ascii_1.hex2ascii(this.body)));
        return control_1.getOrThrow(result, new Error(`getBData() unrecognizable data: ${result}`));
    }
}
exports.default = Block;
