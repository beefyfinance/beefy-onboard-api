import AutoLoad, {AutoloadPluginOptions} from '@fastify/autoload';
import Fastify, { FastifyPluginAsync } from 'fastify';
import cors from '@fastify/cors';
import root from './routes/root';
require('dotenv').config();

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>;

const fastify = Fastify({
  logger: true,
  trustProxy: true
});

const startApp: FastifyPluginAsync<AppOptions> = async (
    fastify,
    opts
): Promise<void> => {
  fastify.register(cors);

  fastify.register(root, '/');

  void fastify.listen({
    port: Number(process.env.PORT) || 3000,
    host: "0.0.0.0"
  })

};

startApp(fastify, {});



