import { Response } from 'express';
import { EventBusService } from '@medusajs/medusa/dist/services';

export function webhook(req: any, res: Response) {
  const eventBus: EventBusService = req.scope.resolve('eventBusService');
  const logger = req.scope.resolve('logger');
  logger.info(`ShipStation webhook received: ${JSON.stringify(req.body)}`);
  eventBus.emit('shipstation.webhook', req.body);
  return res.status(200).json({ message: 'OK' });
}
