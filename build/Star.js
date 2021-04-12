"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Star = void 0;
const t = require("io-ts");
exports.Star = t.type({
    dec: t.string,
    ra: t.string,
    story: t.string,
});
