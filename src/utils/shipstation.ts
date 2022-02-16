import axios, { Axios } from 'axios';

export interface ShipStationClientProps {
  apiKey: string;
  apiSecret: string;
}

export interface ShipStationCarrier {
  name: string;
  code: string;
  accountNumber: string;
  requiresFundedAccount: boolean;
  balance: number;
  nickname: string | null;
  shippingProviderId: number;
  primary: boolean;
}

export interface ShipStationService {
  carrierCode: string;
  code: string;
  name: string;
  domestic: boolean;
  international: boolean;
}

export interface ShipStationWeight {
  value: number;
  units: 'pounds' | 'ounces' | 'grams';
}

export interface ShipStationDimensions {
  units: 'inches' | 'centimeters';
  length: number;
  width: number;
  height: number;
}

export interface GetShipStationRatesProps {
  carrierCode: string;
  serviceCode?: string;
  packageCode?: string;
  fromPostalCode: string;
  toState: string;
  toCountry: string;
  toPostalCode: string;
  toCity: string;
  weight: ShipStationWeight;
  dimensions: ShipStationDimensions;
  confirmation:
    | 'none'
    | 'delivery'
    | 'signature'
    | 'adult_signature'
    | 'direct_signature';
  residential: boolean;
}

export interface ShipStationRate {
  serviceName: string;
  serviceCode: string;
  shipmentCost: number;
  otherCost: number;
}

export interface ShipStationAddress {
  name: string;
  company?: string;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  residential: boolean;
}

export interface ShipStationOrderItem {
  lineItemKey: string;
  sku: string;
  name: string;
  imageUrl?: string;
  weight?: ShipStationWeight;
  quantity: number;
  unitPrice: number;
  taxAmount?: number;
  shippingAmount?: number;
  warehouseLocation?: string;
  options: {
    name: string;
    value: string;
  }[];
  productId?: number;
  fulfillmentSku?: string;
  adjustment?: boolean;
  upc?: string;
}

export interface ShipStationAdvancedOptions {}
export interface ShipStationInternationalOptions {}
export interface ShipStationInsuranceOptions {}

export interface ShipStationOrder {
  orderNumber?: string;
  orderKey?: string;
  orderDate?: Date;
  paymentDate?: Date;
  shipByDate?: Date;
  orderStatus: 'awaiting_shipment' | 'awaiting_payment';
  customerUsername: string;
  customerEmail: string;
  billTo: ShipStationAddress;
  shipTo: ShipStationAddress;
  items: ShipStationOrderItem[];
  amountPaid: number;
  taxAmount: number;
  shippingAmount: number;
  customerNotes?: string;
  internalNotes?: string;
  gift: boolean;
  giftMessage?: string;
  paymentMethod?: string;
  requestedShippingService?: string;
  carrierCode?: string;
  serviceCode?: string;
  packageCode?: string;
  confirmation:
    | 'none'
    | 'delivery'
    | 'signature'
    | 'adult_signature'
    | 'direct_signature';
  shipDate?: string;
  weight?: ShipStationWeight;
  dimensions?: ShipStationDimensions;
  insuranceOptions?: ShipStationInsuranceOptions;
  internationalOptions?: ShipStationInternationalOptions;
  advancedOptions?: ShipStationAdvancedOptions;
  tagIds?: number[];
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
}
