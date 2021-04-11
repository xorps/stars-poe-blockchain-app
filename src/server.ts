import * as http from 'http';
import { createApp } from './app';

async function main() {
    const server = http.createServer(await createApp());

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