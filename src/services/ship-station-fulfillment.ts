import { ClaimService, OrderService } from '@medusajs/medusa/dist/services';
import { FulfillmentService } from 'medusa-interfaces';
import {
  ShipStationAddress,
  ShipStationOrder,
  ShipStationOrderItem,
  ShipStationOrderShippedWebhookData,
  ShipStationWebhook,
  ShipStationWeight,
} from '../utils/types';
import { Promise } from 'bluebird';
import {
  Address,
  defaultAdminOrdersFields,
  LineItem,
  Order,
} from '@medusajs/medusa';
import { ShipStationClient } from '../utils/shipstation';
import { Logger } from 'winston';

export interface ShipStationFulfillmentPluginOptions {
  api_key: string;
  api_secret: string;
  branding_id?: string; // used for ShipStation branded tracking links
  weight_units: 'pounds' | 'ounces' | 'grams';
  dimension_units: 'inches' | 'centimeters';
}

interface ShipstationTrackingLinkParams {
  branding_id: string;
  carrier_code: string;
  tracking_number: string;
  order_number: string;
  postal_code: string;
  locale: string;
}

interface ShipStationFulfillmentData {
  id: string;
  carrier_code: string;
  carrier_name: string;
  service_code: string;
  name: string;
}

const cents2Dollars = (cents: number) => cents / 100;

export default class ShipStationFulfillmentService extends FulfillmentService {
  static identifier = 'shipstation';

  constructor(
    { logger, claimService, orderService },
    {
      api_key,
      api_secret,
      weight_units = 'ounces',
      dimension_units = 'inches',
      branding_id,
    }: ShipStationFulfillmentPluginOptions
  ) {
    super();
    this.logger = logger;
    this.orderService = orderService;
    this.claimService = claimService;
    this.weightUnits = weight_units;
    this.dimensionUnits = dimension_units;
    this.brandingId = branding_id;
    this.client = new ShipStationClient({
      apiKey: api_key,
      apiSecret: api_secret,
    });
  }

  weightUnits: 'pounds' | 'ounces' | 'grams';
  dimensionUnits: 'inches' | 'centimeters';
  brandingId?: string;
  logger: Logger;
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
  async getFulfillmentOptions(): Promise<ShipStationFulfillmentData[]> {
    const carriers = await this.client.listCarriers();

    const arrayOfArrays = await Promise.map(carriers, async carrier => {
      const services = await this.client.listServices(carrier.code);
      return services.map(service => ({
        id: service.code,
        carrier_code: service.carrierCode,
        carrier_name: carrier.name,
        service_code: service.code,
        name: service.name,
      }));
    });
    return arrayOfArrays.flat();
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
    return {
      ...optionData,
      ...data,
    };
  }

  /**
   * Called before a shipping option is created in Admin. Use this to ensure
   * that a fulfillment option does in fact exist.
   */
  async validateOption(data: ShipStationFulfillmentData): Promise<boolean> {
    const options = await this.getFulfillmentOptions();
    return options.some(
      option =>
        option.service_code === data.service_code &&
        option.carrier_code === data.carrier_code
    );
  }
  /**
   * Although ship station can calculate shipping rates, we don't need this right now, as we're just using flat rates for shipping.
   * In the future we can implement this.
   * @param data
   * @returns
   */

  canCalculate(data: ShipStationFulfillmentData) {
    return false;
  }

  /**
   * Used to calculate a price for a given shipping option.
   * Since we are not using shipstation to calculate rates, this method is not needed.
   */
  calculatePrice(data, cart) {
    throw Error('Calculate Price is currently not implemented');
  }

  /**
   * I think there's a lot of data we still need to be able to correctly throw this to shipstation. We need weights and
   * box dimensions in order to be able to do this correctly. For now, they can manually fill it out in shipstation.
   * @param methodData
   * @param items
   * @param order
   * @param fulfillment
   * @returns
   */
  async createFulfillment(
    methodData,
    items: LineItem[],
    order: Order,
    fulfillment: ShipStationFulfillmentData
  ) {
    const ssOrder = this.buildShipStationOrder(items, order, fulfillment);
    return await this.client.createOrUpdateOrder(ssOrder);
  }

  buildTrackingPageUrl(params: ShipstationTrackingLinkParams) {
    const updatedParams = {
      ...params,
      order_number: Buffer.from(params.order_number).toString('base64'),
    };

    const qs = Object.keys(updatedParams)
      .map(
        key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
      )
      .join('&');

    return `https://trackshipment.shipstation.com/?${qs}`;
  }

  async handleWebhook({
    resource_url,
    resource_type,
  }: ShipStationWebhook): Promise<void> {
    if (resource_type === 'SHIP_NOTIFY') {
      const { shipments } =
        await this.client.getWebhookData<ShipStationOrderShippedWebhookData>(
          resource_url
        );

      const orderIds = shipments.map(s => s.orderNumber);

      const orders: Order[] = await this.orderService.list(
        { id: orderIds },
        {
          skip: 0,
          take: 999999,
          order: { created_at: 'DESC' },
          relations: [
            'fulfillments',
            'customer',
            'billing_address',
            'shipping_address',
            'discounts',
            'discounts.rule',
            'shipping_methods',
            'payments',
          ],
          select: defaultAdminOrdersFields,
        }
      );

      await Promise.map(shipments, async shipment => {
        const params = {
          carrier_code: shipment.carrierCode,
          order_number: shipment.orderNumber,
          tracking_number: shipment.trackingNumber,
          postal_code: shipment.shipTo.postalCode,
          locale: 'en',
          branding_id: this.brandingId,
        };

        const order = orders.find(o => o.id === shipment.orderNumber);
        if (!order) return;
        const trackingNumbers = shipment.trackingNumber
          ? [
              {
                tracking_number: shipment.trackingNumber,
                url: this.buildTrackingPageUrl(params),
              },
            ]
          : [];
        await this.orderService.createShipment(
          order.id,
          shipment.orderKey,
          trackingNumbers
        );
      });
    }
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
   * We don't want any returns, so leaving this empty.
   */
  getReturnDocuments(data) {
    return [];
  }

  /**
   * Used to retrieve documents related to a shipment.
   * We can support showing packing slips and labels in the future if we want to add that to the medusa admin ourselves.
   */
  getShipmentDocuments(data) {
    return [];
  }

  private buildShipStationItem(item: LineItem): ShipStationOrderItem {
    return {
      lineItemKey: item.id,
      quantity: item.quantity,
      sku: item.variant.sku,
      name: item.variant.title,
      unitPrice: cents2Dollars(item.unit_price),
      imageUrl: item.thumbnail,
      weight: this.buildShipStationWeight(item.variant.weight),
      options: [],
    };
  }

  private buildShipStationAddress(
    address?: Address
  ): ShipStationAddress | null {
    if (!address) return null;
    return {
      name: `${address.first_name} ${address.last_name}`,
      company: address.company,
      street1: address.address_1,
      street2: address.address_2,
      city: address.city,
      state: address.province,
      postalCode: address.postal_code,
      country: (address.country_code || '').toUpperCase(),
      phone: address.phone,
      residential: true,
    };
  }

  private buildShipStationOrder(
    items: LineItem[],
    order: Order,
    fulfillment: ShipStationFulfillmentData
  ): ShipStationOrder {
    return {
      orderNumber: order.id,
      orderKey: fulfillment.id,
      orderDate: order.created_at,
      orderStatus: 'awaiting_shipment',
      customerUsername: order.email,
      customerEmail: order.email,
      billTo: this.buildShipStationAddress(order.billing_address),
      shipTo: this.buildShipStationAddress(order.shipping_address),
      items: items.map(item => this.buildShipStationItem(item)),
      amountPaid: cents2Dollars(order.total),
      taxAmount: cents2Dollars(order.tax_total),
      shippingAmount: cents2Dollars(order.shipping_total),
      gift: false,
      confirmation: 'delivery',
      carrierCode: fulfillment.carrier_code,
      serviceCode: fulfillment.service_code,
    };
  }

  private buildShipStationWeight(
    weight?: number
  ): ShipStationWeight | undefined {
    if (!weight) return undefined;

    return {
      value: weight,
      units: this.weightUnits,
    };
  }
}
