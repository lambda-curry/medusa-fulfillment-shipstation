import bodyParser = require('body-parser');
import { Router } from 'express';
import { webhook } from './webhook';

/* TODO second argument pluginConfig: Record<string, unknown> part of PR https://github.com/medusajs/medusa/pull/959 not yet in master */
export default (): Router => {
  const app = Router();

  app.post('/shipstation/webhook', bodyParser.json(), webhook);

  return app;
};
