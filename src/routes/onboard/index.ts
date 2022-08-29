import { FastifyPluginAsync } from "fastify"
import { getCountryFromIP } from "./ipService"
import { getQuotes, getRedirect, onboardStart } from './onboard'
import { sign } from "./protocol"

const bodyJsonSchema = {
  type: 'object',
  required: ['cryptoCurrency', 'fiatCurrency', 'amountType', 'amount', 'network', 'providers'],
  properties: {
    cryptoCurrency: { type: 'string' },
    fiatCurrency: { type: 'string' },
    amountType: {
      type: 'string',
      enum: ['fiat', 'crypto']
    },
    amount: { type: 'number' },
    network: { type: 'string' },
    providers: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['transak', 'binance']
      }
    }
  }
};

const signBodyJsonSchema = {
  type: 'object',
  required: ['stringToSign'],
  properties: {
    stringToSign: { type: 'string' }
    }
};

const redirectBodyJsonSchema = {
  type: 'object',
  required: ['cryptoCurrency', 'fiatCurrency', 'amountType', 'amount', 'network', 'provider'],
  properties: {
    cryptoCurrency: { type: 'string' },
    fiatCurrency: { type: 'string' },
    amountType: {
      type: 'string',
      enum: ['fiat', 'crypto']
    },
    amount: { type: 'number' },
    network: { type: 'string' },
    provider: {
      type: 'string',
      enum: ['transak', 'binance']
    },
    paymentMethod: { type: 'string'}
  }
};

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {

  fastify.get('/', async function (request, reply) {
    return await onboardStart(request.ip);
  })



  fastify.post('/quote', { schema: { body: bodyJsonSchema } }, async function (request, reply) {
    let countryCode = await getCountryFromIP(request.ip);

    const body: any = request.body;
    try {
      let resp = await getQuotes(body.providers, body.network, body.cryptoCurrency, body.fiatCurrency, body.amountType, body.amount, countryCode);
      return resp;
    } catch (err) {
      console.log(err);
    }

  });

  fastify.post('/sign', { schema: { body: signBodyJsonSchema } } ,async function (request, reply) {

    let body: any = request.body;
    return sign(body.stringToSign).toString('base64');

  });

  fastify.post('/init', { schema: { body: redirectBodyJsonSchema } } ,async function (request, reply) {

    let body: any = request.body;

    if (body.provider === 'transak' && !body.paymentMethod) reply.badRequest("'paymentMethod' required for transak provider")
    if (body.provider === 'binance' && body.amountType !== 'fiat') reply.badRequest("'fiat' amountType required for binance provider")
    return getRedirect(body.provider, body.network, body.cryptoCurrency, body.fiatCurrency, body.amountType, body.amount, body.address, body.paymentMethod);

  });

}


export default example;
