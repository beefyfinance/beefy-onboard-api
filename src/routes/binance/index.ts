import { FastifyPluginAsync } from "fastify"
import { getNetworkList, getNetworkListWithProxy } from "./service"

const example: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return 'Binance connect'
  })

  fastify.get('/network', async function (request, reply) {
    await getNetworkList();
    return 'networkList'
  })

  fastify.get('/networkProxy', async function (request, reply) {
    await getNetworkListWithProxy();
    return 'networkListWithProxy'
  })
}


export default example;
