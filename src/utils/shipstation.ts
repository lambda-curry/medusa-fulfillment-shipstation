import axios, { Axios } from 'axios';
import {
  GetShipStationRatesProps,
  ShipStationCarrier,
  ShipStationOrder,
  ShipStationService,
} from './types';

export interface ShipStationClientProps {
  apiKey: string;
  apiSecret: string;
}

export class ShipStationClient {
  constructor(props: ShipStationClientProps) {
    this.client = axios.create({
      baseURL: 'https://ssapi.shipstation.com',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${props.apiKey}:${props.apiSecret}`
        ).toString('base64')}`,
      },
    });
  }
  client: Axios;

  async getRates(props: GetShipStationRatesProps) {
    const res = await this.client.post('/shipments/getrates', props);
    return res.data;
  }

  async listCarriers(): Promise<ShipStationCarrier[]> {
    const res = await this.client.get<ShipStationCarrier[]>('/carriers');
    return res.data;
  }

  async listServices(carrierCode: string): Promise<ShipStationService[]> {
    const res = await this.client.get<ShipStationService[]>(
      `/carriers/listservices?carrierCode=${carrierCode}`
    );
    return res.data;
  }

  async createOrUpdateOrder(
    order: ShipStationOrder
  ): Promise<ShipStationOrder> {
    const res = await this.client.post('/orders/createorder', order);
    return res.data;
  }

  /**
   * Caller needs to provide the expected response type.
   * @param url
   * @returns
   */
  async getWebhookData<T>(url: string): Promise<T> {
    const res = await this.client.get<T>(url);
    return res.data;
  }
}
