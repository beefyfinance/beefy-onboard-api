import { FastifyPluginAsync } from "fastify"
import { getNetworkList, getTradePairs } from "./service"

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return 'Binance connect'
  })

  fastify.get('/network', async function (request, reply) {
    await getNetworkList();
    return 'network list';
  })

  fastify.get('/pairs', async function (request, reply) {
    await getTradePairs();
    return 'trade pairs';
  })

  fastify.get('/keys', async function (request, reply) {
    
    return 'networkListWithProxy';
  })

  fastify.get('/ip', async function (request, reply) {
    console.log('ip ' + request.ip);
    console.log(request.forwarded);
    return request.ip;
  })
}


export default example;
