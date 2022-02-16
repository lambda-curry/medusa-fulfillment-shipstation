import {
  ClaimService,
  EventBusService,
  OrderService,
} from '@medusajs/medusa/dist/services';
import { FulfillmentService } from 'medusa-interfaces';
import { ShipStationClient } from 'utils/shipstation';
import { Promise } from 'bluebird';

export interface ShipStationFulfillmentPluginOptions {
  api_key: string;
  api_secret: string;
}

interface ShipStationFullfillmentData {
  id: string;
  carrier_code: string;
  carrier_name: string;
  service_code: string;
  name: string;
}

export class ShipstationFulfillmentService extends FulfillmentService {
  constructor(
    { logger, claimService, orderService },
    { api_key, api_secret }: ShipStationFulfillmentPluginOptions
  ) {
    super();
    this.logger = logger;
    this.orderService = orderService;
    this.claimService = claimService;
    this.client = new ShipStationClient({
      apiKey: api_key,
      apiSecret: api_secret,
    });
  }

  logger: Console;
  orderService: OrderService;
  claimService: ClaimService;
  client: ShipStationClient;

  getIdentifier() {
    return 'shipstation';
  }

  /**
   * Called before a shipping option is created in Admin. The method should
   * return all of the options that the fulfillment provider can be used with,
   * and it is here the distinction between different shipping options are
   * enforced. For example, a fulfillment provider may offer Standard Shipping
   * and Express Shipping as fulfillment options, it is up to the store operator
   * to create shipping options in Medusa that can be chosen between by the
   * customer.
   */
  async getFulfillmentOptions(): Promise<ShipStationFullfillmentData[]> {
    const carriers = await this.client.listCarriers();

    return Promise.map(carriers, async carrier => {
      const services = await this.client.listServices(carrier.code);
      return services.map(service => ({
        id: service.code,
        carrier_code: service.carrierCode,
        carrier_name: carrier.name,
        service_code: service.code,
        name: service.name,
      }));
    });
  }

  /**
   * Called before a shipping method is set on a cart to ensure that the data
   * sent with the shipping method is valid. The data object may contain extra
   * data about the shipment such as an id of a drop point. It is up to the
   * fulfillment provider to enforce that the correct data is being sent
   * through.
   * @param {object} data - the data to validate
   * @param {object} cart - the cart to which the shipping method will be applied
   * @return {object} the data to populate `cart.shipping_methods.$.data` this
   *    is usually important for future actions like generating shipping labels
   */
  validateFulfillmentData(optionData, data, cart) {
    this.logger.warn(
      'validateFulfillmentData called:' + JSON.stringify({ data, cart })
    );
    return {
      ...optionData,
      ...data,
    };
  }

  /**
   * Called before a shipping option is created in Admin. Use this to ensure
   * that a fulfillment option does in fact exist.
   */
  async validateOption(data: ShipStationFullfillmentData): Promise<boolean> {
    const options: ShipStationFullfillmentData[] =
      await this.getFulfillmentOptions();
    return options.some(
      option =>
        option.service_code === data.service_code &&
        option.carrier_code === data.carrier_code
    );
  }

  canCalculate(data) {
    return false;
  }

  /**
   * Used to calculate a price for a given shipping option.
   */
  calculatePrice(data, cart) {
    throw Error('calculatePrice must be overridden by the child class');
  }

  createFulfillment(methodData, items, order, fulfillment) {
    console.log('create fulfillment', methodData, items, order, fulfillment);
    throw Error('createOrder must be overridden by the child class');
  }

  /**
   * Used to retrieve documents associated with a fulfillment.
   * Will default to returning no documents.
   */
  getFulfillmentDocuments(data) {
    return [];
  }

  /**
   * Used to create a return order. Should return the data necessary for future
   * operations on the return; in particular the data may be used to receive
   * documents attached to the return.
   */
  createReturn(fromData) {
    throw Error('createReturn must be overridden by the child class');
  }

  /**
   * Used to retrieve documents related to a return order.
   */
  getReturnDocuments(data) {
    return [];
  }

  /**
   * Used to retrieve documents related to a shipment.
   */
  getShipmentDocuments(data) {
    return [];
  }
}
