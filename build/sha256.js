"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sha256 = require("crypto-js/sha256");
/** using native */
/*
export default async function (data: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    // Compute a hash using NodeJS Streams
    // I haven't verified if this uses a CryptoJob behind the scenes.
    return await new Promise((resolve, reject) => {
        let result: any;
        hash.update(Buffer.from(data));
        hash.on('data', (new_result) => result = new_result);
        hash.end();
        stream.finished(hash, (err) => {
            if (err) reject(err);
            else if (result instanceof Buffer) resolve(result.toString('hex'));
            else reject(`sha256 unexpected result: ${result}`);
        });
    });
}
*/
function default_1(data) {
    return sha256(data).toString();
}
exports.default = default_1;
