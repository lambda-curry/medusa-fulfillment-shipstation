# Medusa ShipStation Fulfillment Plugin

## What it does.

Medusa allows us to create fulfillment plugins to manage integrations with shipping providers. This plugin manages an integration with ShipStation, which we can use to create shipping labels, packing slips, etc for many different providers (usps, ups, fedex, etc).

This plugin allows us to configure different shipping options from providers in the Medusa Admin. It also creates orders in ShipStation when orders when a fulfillment order is created in Medusa.

If you setup webhooks for shipstation, they will notify Medusa when the order is shipped (when a label is created), and provide medusa with tracking numbers.

For more information on how the fulfillment API works, check out this medusa doc: https://docs.medusajs.com/guides/fulfillment-api

## Installing

You install this plugin just like any other, in the `medusa-config.js` file.

You need to provide 3 data properties to make it work correctly.

```
  {
    resolve: `@lambdacurry/medusa-fulfillment-shipstation`,
    options: {
      api_key: 'shipstation-api-key',
      api_secret: 'shipstation-secret-key',
      weight_units: 'ounces', // optional property, valid values are 'ounces', 'pounds', or 'grams'.
      dimension_units: 'inches' // optional property, valid values are 'centimeters' or 'inches'.
    }
  }

```

If you would like shipping notifications connected back into medusa, you will want to setup shipstation webhooks also.

You can do this in the ShipStation dashboard at https://ship13.shipstation.com/settings/integrations/Webhooks

You need to configure a "On Orders Shipped" webhook that points to ${MEDUSA_URL}/shipstation/webhook

## Known limitations

Currently this plugin does not handle returns or swaps.
Currently this plugin does not handle generating the shipping price on a per-cart basis. You must set a flat rate.

## Help

If you need any help, you can reach out to derek@lambdacurry.dev
