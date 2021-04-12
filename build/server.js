"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const app_1 = require("./app");
async function main() {
    const server = http.createServer(await app_1.createApp());
    server.listen(8000, () => {
        const address = server.address();
        if (typeof address === "string" || address === null) {
            throw new Error(`unexpected address type, received: ${address}`);
        }
        console.log(`Listening on ${address.address}:${address.port}`);
    });
}
main().catch(err => {
    console.error('Error caught in main: ', err);
});
