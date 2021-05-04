import * as express from 'express';
import * as t from 'io-ts';
import { fold } from 'fp-ts/Either';
import { Star } from './Star';
import Blockchain from './Blockchain';
import SubmitStarError from './SubmitStarError';

/** jsonAPI result ADT */
type TResult 
    = { readonly tag: 'TJson'; readonly data: object }
    | { readonly tag: 'TBlockNotFound' }
    | { readonly tag: 'TInvalidParameters' }
    ;

// TResult constructors
const json = (data: object): TResult => ({ tag: 'TJson', data});
const BlockNotFound: TResult = { tag: 'TBlockNotFound' };
const InvalidParameters: TResult = { tag: 'TInvalidParameters' };

type JsonHandler = (request: Readonly<express.Request>) => Promise<TResult>;
type SchemaProps<Schema extends t.Props> = t.TypeOf<t.TypeC<Schema>>;
type SchemaHandler<Schema extends t.Props> = (data: SchemaProps<Schema>) => Promise<TResult>;

const jsonAPI = (handler: JsonHandler): express.RequestHandler => async (req, res, _next) => {
    try {
        const result = await handler(req);
        // force exhaustive pattern match
        // we don't actually care about return value here..
        ((): express.Response => {
            switch (result.tag) {
                case 'TJson': return res.status(200).json(result.data);
                case 'TBlockNotFound': return res.status(404).json({error: 'Block not found'});
                case 'TInvalidParameters': return res.status(500).json({error: 'Invalid request parameters'});
            }
        })();
    } catch (err) {
        // Okay to show this to user
        if (err instanceof SubmitStarError) {
            res.status(500).json({error: err.message});
        } else {
            // Unexpected error
            console.error('Internal error caught: ', err);
            res.status(500).json({error: 'An internal error occurred'});
        }
    }
};

const schema = <Schema extends t.Props>(schema: Schema, func: SchemaHandler<Schema>): JsonHandler => (request: Readonly<express.Request>): Promise<TResult> => fold(
    async (_) => InvalidParameters,
    async (data: SchemaProps<Schema>) => await func(data)
)(t.type(schema).decode(request.body));

export async function createApp(): Promise<express.Application & {blockchain: Blockchain}> {
    const blockchain = await Blockchain.create();
    const app = Object.assign(express(), {blockchain});

    app.use(express.urlencoded({extended: true}));
    app.use(express.json());

    app.get('/block/hash/:hash', jsonAPI(async (req) => {
        const {hash} = req.params;
        const block = await blockchain.getBlockByHash(hash);
        if (block === undefined) return BlockNotFound;
        return json(block);
    }));

    app.get('/block/height/:height', jsonAPI(async (req) => {
        const passes_regex = /^\d+$/.test(req.params.height);
        const height = Number(req.params.height);
        if (!passes_regex || isNaN(height)) return InvalidParameters;
        const block = await blockchain.getBlockByHeight(height);
        if (block === undefined) return BlockNotFound;
        return json(block);
    }));

    app.get('/blocks/:address', jsonAPI(async (req) => {
        const {address} = req.params;
        const stars = await blockchain.getStarsByWalletAddress(address);
        if (stars === undefined) return BlockNotFound;
        return json(stars);
    }));


    app.post('/requestValidation', jsonAPI(schema({address: t.string}, async ({address}) => json(await blockchain.requestMessageOwnershipVerification(address)))));

    app.post('/submitstar', jsonAPI(schema(
        {address: t.string, message: t.string, signature: t.string, star: Star}, 
        async (data) => json(await blockchain.submitStar(data))
    )));

    app.get('/validateChain', jsonAPI(async (_) => {
        const errors = await blockchain.validateChain();
        return json({errors});
    }));

    return app;
}