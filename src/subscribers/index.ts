import ShipStationFulfillmentService from '../services/ship-station-fulfillment';
import { EventBusService } from '@medusajs/medusa/dist/services';
import { ShipStationWebhook } from 'utils/types';

class ShipStationSubscriber {
  private shipStationService: ShipStationFulfillmentService;

  constructor({
    eventBusService,
    shipStationFulfillmentService,
  }: {
    eventBusService: EventBusService;
    shipStationFulfillmentService: ShipStationFulfillmentService;
  }) {
    this.shipStationService = shipStationFulfillmentService;
    eventBusService.subscribe(
      'shipstation.webhook',
      this.handleWebhook.bind(this)
    );
  }

  private async handleWebhook(data: ShipStationWebhook): Promise<boolean> {
    await this.shipStationService.handleWebhook(data);
    return true;
  }
}

export default ShipStationSubscriber;
