"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request = require("supertest");
const bitcoinMessage = require("bitcoinjs-message");
const bitcoin = require("bitcoinjs-lib");
const app_1 = require("./app");
const Blockchain_1 = require("./Blockchain");
const Block_1 = require("./Block");
const sha256_1 = require("./sha256");
const Message_1 = require("./Message");
const app = app_1.createApp();
test('genesis block exists', async () => {
    const response = await request(await app).get('/block/height/0');
    expect(response.body.body).toStrictEqual("7b2264617461223a2247656e6573697320426c6f636b227d");
    expect(response.body.height).toStrictEqual(0);
    expect(response.body.previousBlockHash).toStrictEqual(null);
    expect(response.body).toHaveProperty('hash');
    expect(response.body).toHaveProperty('time');
});
test('validation', async () => {
    const address = 'mywalletaddress';
    const response = await request(await app).post('/requestValidation').type('form').send({ address });
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toMatch(/^\w+:\d+:starRegistry$/);
});
test('Blockchain::validateChain fails when genesis is bad', async () => {
    const chain = await Blockchain_1.default.create();
    (await chain.getBlockByHeight(0)).hash = "0xgarbagevalue";
    expect(await chain.validateChain()).toMatchObject(['Invalid block at 0']);
});
test('Blockchain::validateChain fails when second block is bad', async () => {
    const chain = await Blockchain_1.default.create();
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'second block' }));
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'third block' }));
    (await chain.getBlockByHeight(1)).height = 5;
    expect(await chain.validateChain()).toMatchObject(['Invalid block at 1']);
});
test('Blockchain::validateChain fails when third block is bad', async () => {
    const chain = await Blockchain_1.default.create();
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'second block' }));
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'third block' }));
    (await chain.getBlockByHeight(2)).height = 5;
    expect(await chain.validateChain()).toMatchObject(['Invalid block at 2']);
});
test('Blockchain::validateChain succeeds when clean', async () => {
    const chain = await Blockchain_1.default.create();
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'second block' }));
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'third block' }));
    expect(await chain.validateChain()).toMatchObject([]);
});
test('Blockchain::validateChain collects all 3 errors', async () => {
    const chain = await Blockchain_1.default.create();
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'second block' }));
    await Object.getPrototypeOf(chain)._addBlock.bind(chain)(new Block_1.default({ data: 'third block' }));
    (await chain.getBlockByHeight(0)).height = Math.random();
    (await chain.getBlockByHeight(1)).height = Math.random();
    (await chain.getBlockByHeight(2)).height = Math.random();
    expect(await chain.validateChain()).toMatchObject([0, 1, 2].map(n => `Invalid block at ${n}`));
});
describe('/submitstar', () => {
    it('it adds block and returns block on success', async () => {
        jest.spyOn(bitcoinMessage, 'verify').mockReturnValueOnce(true);
        const address = sha256_1.default(Math.random().toString());
        const signature = sha256_1.default(address);
        const message = Message_1.default.create(address).toString();
        const star = { dec: "68 52 56", ra: "16h", story: "Generic story" };
        const json = { address, signature, message, star };
        const response = await request(await app).post('/submitstar').type('json').send(json);
        const blockchain = (await app).blockchain;
        const index = 1;
        const block = (await blockchain.getBlockByHeight(index));
        expect(response.body).toMatchObject(block);
    });
});
test('full workflow', async () => {
    const keyPair = bitcoin.ECPair.makeRandom();
    const { address } = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey });
    const requestValidationResponse = await request(await app).post('/requestValidation').type('form').send({ address });
    expect(requestValidationResponse.body).toHaveProperty('message');
    const message = requestValidationResponse.body.message;
    const signature = bitcoinMessage.sign(message, keyPair.privateKey, keyPair.compressed).toString('base64');
    const star = { dec: '72 32 19', ra: '6h', story: 'Star Story' };
    const submitStarResponse = await request(await app).post('/submitstar').type('json').send({ address, signature, message, star });
    const expectedBlock = await (async () => {
        const chain = (await app).blockchain;
        const index = chain['chain'].length - 1;
        return chain['chain'][index];
    })();
    expect(submitStarResponse.body).toMatchObject(expectedBlock);
    const getStarResponse = await request(await app).get(`/blocks/${address}`);
    expect(getStarResponse.body).toMatchObject([{ owner: address, star }]);
    const validateChainResponse = await request(await app).get('/validateChain');
    expect(validateChainResponse.body).toMatchObject({ errors: [] });
});
