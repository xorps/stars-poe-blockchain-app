"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrThrow = void 0;
const Either_1 = require("fp-ts/Either");
/** unwraps right side or throws err
 * @throws E
 */
function getOrThrow(m, err) {
    if (Either_1.isLeft(m))
        throw err;
    return m.right;
}
exports.getOrThrow = getOrThrow;
