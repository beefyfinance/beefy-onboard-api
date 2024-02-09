import { FastifyPluginAsync } from 'fastify'
import onboardRoutes from './onboard';

const root: FastifyPluginAsync = async (fastify, opts): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    return { root: true }
  })

  fastify.register(onboardRoutes, { prefix: '/onboard' });
}

export default root;
