"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const D = require("io-ts/Decoder");
const Function_1 = require("fp-ts/Function");
class Message {
    constructor(walletAddress, timestamp) {
        this.walletAddress = walletAddress;
        this.timestamp = timestamp;
    }
    static create(walletAddress) {
        return new Message(walletAddress, Date.now());
    }
    static decoder(expectedAddress) {
        return Function_1.pipe(D.string, D.parse(s => {
            const result = /^(\w+):(\d+):starRegistry$/[Symbol.match](s);
            if (result === null)
                return D.failure(s, 'Mesage failed to parse');
            const [_, address, timestampString] = result;
            if (address !== expectedAddress)
                return D.failure(s, 'Address does not match');
            const timestamp = Number(timestampString);
            if (isNaN(timestamp))
                return D.failure(s, 'Message failed to convert timestamp to number');
            return D.success(new Message(address, timestamp));
        }));
    }
    toString() {
        return `${this.walletAddress}:${this.timestamp}:starRegistry`;
    }
}
exports.default = Message;
