"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = void 0;
const express = require("express");
const t = require("io-ts");
const Either_1 = require("fp-ts/Either");
const Star_1 = require("./Star");
const Blockchain_1 = require("./Blockchain");
const SubmitStarError_1 = require("./SubmitStarError");
// TResult constructors
const json = (data) => ({ tag: 'TJson', data });
const BlockNotFound = { tag: 'TBlockNotFound' };
const InvalidParameters = { tag: 'TInvalidParameters' };
const jsonAPI = (handler) => async (req, res, _next) => {
    try {
        const result = await handler(req);
        // force exhaustive pattern match
        // we don't actually care about return value here..
        (() => {
            switch (result.tag) {
                case 'TJson': return res.status(200).json(result.data);
                case 'TBlockNotFound': return res.status(404).json({ error: 'Block not found' });
                case 'TInvalidParameters': return res.status(500).json({ error: 'Invalid request parameters' });
            }
        })();
    }
    catch (err) {
        // Okay to show this to user
        if (err instanceof SubmitStarError_1.default) {
            res.status(500).json({ error: err.message });
        }
        else {
            // Unexpected error
            console.error('Internal error caught: ', err);
            res.status(500).json({ error: 'An internal error occurred' });
        }
    }
};
const schema = (schema, func) => (request) => Either_1.fold(async (_) => InvalidParameters, async (data) => await func(data))(t.type(schema).decode(request.body));
async function createApp() {
    const blockchain = await Blockchain_1.default.create();
    const app = Object.assign(express(), { blockchain });
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.get('/block/hash/:hash', jsonAPI(async (req) => {
        const { hash } = req.params;
        const block = await blockchain.getBlockByHash(hash);
        if (block === undefined)
            return BlockNotFound;
        return json(block);
    }));
    app.get('/block/height/:height', jsonAPI(async (req) => {
        const passes_regex = /^\d+$/.test(req.params.height);
        const height = Number(req.params.height);
        if (!passes_regex || isNaN(height))
            return InvalidParameters;
        const block = await blockchain.getBlockByHeight(height);
        if (block === undefined)
            return BlockNotFound;
        return json(block);
    }));
    app.get('/blocks/:address', jsonAPI(async (req) => {
        const { address } = req.params;
        const stars = await blockchain.getStarsByWalletAddress(address);
        if (stars === undefined)
            return BlockNotFound;
        return json(stars);
    }));
    app.post('/requestValidation', jsonAPI(schema({ address: t.string }, async ({ address }) => json(await blockchain.requestMessageOwnershipVerification(address)))));
    app.post('/submitstar', jsonAPI(schema({ address: t.string, message: t.string, signature: t.string, star: Star_1.Star }, async (data) => json(await blockchain.submitStar(data)))));
    return app;
}
exports.createApp = createApp;
