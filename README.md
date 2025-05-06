<p align="center">
  <img src="https://i.imgur.com/5VacA1K.png" width="150"/>
  <h1 align="center">FixedFloat API</h1>
  
  <p align="center">
    <img src="https://img.shields.io/npm/v/ff-io.svg?label=version&style=flat-square"/> 
    <img src="https://img.shields.io/bundlephobia/minzip/ff-io?label=size&style=flat-square"/> 
    <img src="https://img.shields.io/npm/l/ff-io?style=flat-square"/>
    <br>FixedFloat (ff.io) API wrapper.
    <br><a href="https://ff.io/api">Official API Docs</a> | <a href="https://ff.io/">Website</a> | <a href="https://ff.io/faq">FAQ</a>
  </p>
</p>

## Installation
With NPM:
```bash
npm i ff-io
```

With Yarn:
```bash
yarn add ff-io
```

## Usage
```javascript
const FixedFloat = require("ff-io"); // or import FixedFloat from 'ff-io';
const ff = new FixedFloat('YOUR_API_KEY', 'YOUR_API_SECRET');
```

## FixedFloat Client Methods

The `FixedFloat` class is your main entry point to interact with the API.

### constructor(apiKey, secretKey)
Initializes the API client.
*   `apiKey` (String): Your API key.
*   `secretKey` (String): Your secret key.

### .getCurrencies()
Fetches the list of available currencies.
*   Returns: `Promise<Object>` - Currency data from API.
*   See [API Docs: Available currencies](https://ff.io/api#method_ccies)

### .getPrice({ fromCcy, toCcy, amount, direction = 'from', type = 'float' })
Retrieves exchange rate information for a currency pair.
*   Params:
    *   `fromCcy` (String): Currency code to exchange from (e.g., "BTC").
    *   `toCcy` (String): Currency code to exchange to (e.g., "ETH").
    *   `amount` (Number): Amount to exchange.
    *   `direction` (String, optional): Specifies if `amount` is for `fromCcy` ("from") or `toCcy` ("to"). Default: "from".
    *   `type` (String, optional): Order type, "fixed" or "float". Default: "float".
*   Returns: `Promise<Object>` - Price data.
*   See [API Docs: Exchange rate](https://ff.io/api#method_price)

### .createOrder({ fromCcy, toCcy, toAddress, amount, ...rest })
Creates a new exchange order.
*   Params (key ones listed, see JSDoc in code for full list):
    *   `fromCcy` (String): Currency to send.
    *   `toCcy` (String): Currency to receive.
    *   `toAddress` (String): Recipient address for `toCcy`.
    *   `amount` (Number): Amount to exchange.
    *   `direction` (String, optional): "from" or "to". Default: "from".
    *   `type` (String, optional): "fixed" or "float". Default: "float".
    *   `extraId` (String, optional): Memo/Destination Tag for `toAddress`.
    *   `refundAddress` (String, optional): Refund address.
*   Returns: `Promise<Order>` - An [Order object](#order-object) instance.
*   See [API Docs: Create order](https://ff.io/api#method_create)

### .getOrder(id, token)
Fetches details of an existing order.
*   `id` (String): Order ID.
*   `token` (String): Order security token.
*   Returns: `Promise<Order>` - An [Order object](#order-object) instance.
*   See [API Docs: Get order details](https://ff.io/api#method_order)

### .setEmergency(id, token, choice, address)
Sets an emergency action for an order (e.g., refund or force exchange).
*   `id` (String): Order ID.
*   `token` (String): Order security token.
*   `choice` (String): "EXCHANGE" or "REFUND".
*   `address` (String, optional): Refund address (if `choice` is "REFUND").
*   Returns: `Promise<Object>` - API response.
*   See [API Docs: Emergency Action Choice](https://ff.io/api#method_emergency)

### .setEmailNotification(id, token, email)
Subscribes to email notifications for an order.
*   `id` (String): Order ID.
*   `token` (String): Order security token.
*   `email` (String): Email address.
*   Returns: `Promise<Object>` - API response.
*   See [API Docs: Subscribe to notification](https://ff.io/api#method_setemail)

### .getQRCodes(id, token)
Retrieves QR code images for an order.
*   `id` (String): Order ID.
*   `token` (String): Order security token.
*   Returns: `Promise<Object>` - QR code data.
*   See [API Docs: Images of QR codes](https://ff.io/api#method_qr)

### .getRatesXML(type = 'float')
Fetches exchange rates as an XML string. No authentication needed.
*   `type` (String, optional): "fixed" or "float". Default: "float".
*   Returns: `Promise<String>` - XML data.
*   See [API Docs: XML export file of rates](https://ff.io/api#method_xmlexport)

## Order Object

The `Order` object is returned by `createOrder` and `getOrder` methods. It holds all information about a specific order and provides methods to manage it.

### Key Order Properties

The `Order` instance contains properties directly mapped from the FixedFloat API response. Here are some of the most commonly used ones:

| Property        | Type            | Description                                                                 |
|-----------------|-----------------|-----------------------------------------------------------------------------|
| `id`            | `String`        | Unique order identifier.                                                    |
| `token`         | `String`        | Security token for managing the order.                                      |
| [`status`](#order-states)        | `String`        | Current order status (e.g., "NEW", "PENDING", "COMPLETED", "EXPIRED").      |
| `type`          | `String`        | Order type ("float" or "fixed").                                          |
| `address`       | `String`        | The FixedFloat deposit address for the `from` currency.                     |
| `toAddress`     | `String`        | The recipient address for the `to` currency.                                |
| `extraId`       | `String`        | Optional MEMO or Destination Tag for `toAddress`.                           |
| `from.ccy`      | `String`        | Currency code being sent (e.g., "BTC").                                     |
| `from.name`     | `String`        | Name of the currency being sent (e.g., "Bitcoin").                          |
| `from.amount`   | `Number`        | Amount of `from.ccy` to be sent.                                            |
| `to.ccy`        | `String`        | Currency code to be received (e.g., "ETH").                                 |
| `to.name`       | `String`        | Name of the currency to be received (e.g., "Ethereum").                     |
| `to.amount`     | `Number`        | Amount of `to.ccy` to be received.                                          |
| `used`          | `Number`        | Order creation timestamp (Unix).                                              |
| `expire`        | `Number`        | Order expiration timestamp (Unix).                                            |
| `remaining`     | `Number`        | Time remaining until expiration (seconds).                                    |

For a complete list of all possible properties, refer to the "Get order details" and "Create order" sections in the [Official API Docs](https://ff.io/api).

### Order Methods

These methods are available on an `Order` object instance (e.g., `const order = await ff.getOrder(...);`).

#### order.refresh()
Refreshes the order data by fetching the latest information from the API. Updates the current `Order` object in place.
*   Returns: `Promise<Order>` (self).

#### order.setEmergency(choice, address)
Sets an emergency action for the order.
*   `choice` (String): "EXCHANGE" or "REFUND".
*   `address` (String, optional): Required if `choice` is "REFUND".
*   Returns: `Promise<Object>` - API response.
*   See [API Docs: Emergency Action Choice](https://ff.io/api#method_emergency)

#### order.setEmailNotification(email)
Subscribes to email notifications for changes in this order's status.
*   `email` (String): Email address for notifications.
*   Returns: `Promise<Object>` - API response.
*   See [API Docs: Subscribe to notification](https://ff.io/api#method_setemail)

#### order.getQRCodes()
Retrieves QR code images (e.g., for the deposit address) for this order.
*   Returns: `Promise<Object>` - API response. The `data` field in the response will be an array of QR code objects.
    Each object in the array typically has the following structure:
    *   `title` (String): The title of the QR code (e.g., "With amount", "Address").
    *   `src` (String): The QR code image encoded in Base64 data URI format (e.g., "data:image/png;base64,iVBORw0KGgo...").
    *   `checked` (Boolean): Indicates if this QR code is the default or primary one.
*   See [API Docs: Images of QR codes](https://ff.io/api#method_qr)

```javascript
try {
    await order.refresh();
    console.log(`Refreshed status: ${order.status}`);

    const qrData = await order.getQRCodes(); // qrData is the raw API response
    if (qrData && qrData.data && qrData.data.length > 0) {
      console.log('Available QR Codes:');
      qrData.data.forEach(qr => {
        console.log(`- Title: ${qr.title}, Checked: ${qr.checked}`);
        console.log(`  Source (Base64): ${qr.src.substring(0, 50)}...`);
      });
    }

  } catch (error) {
    console.error('Error using order methods:', error.message);
  }
```

## Order States

The `order.status` property directly reflects the status string provided by the FixedFloat API. Here are the possible values and their meanings:

*   **NEW** — New order.
*   **PENDING** — Transaction received, pending confirmation.
*   **EXCHANGE** — Transaction confirmed, exchange in progress.
*   **WITHDRAW** — Sending funds.
*   **DONE** — Order completed.
*   **EXPIRED** — Order expired.
*   **EMERGENCY** — Emergency, customer choice required.

Always refer to the `order.status` property for the most up-to-date state of your order. You can find more details on order flow in the [Official API Docs](https://ff.io/api).

## License
ff-io is Licensed under the [MIT License](https://github.com/wilddip/ff-io/blob/main/LICENSE).