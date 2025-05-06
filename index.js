const axios = require('axios').default;
const crypto = require('crypto');

/**
 * @typedef {"NEW"|"PENDING"|"EXCHANGE"|"WITHDRAW"|"DONE"|"EXPIRED"|"EMERGENCY"} OrderStatus
 * Represents the possible statuses of an order:
 * - **NEW**: New order
 * - **PENDING**: Transaction received, pending confirmation
 * - **EXCHANGE**: Transaction confirmed, exchange in progress
 * - **WITHDRAW**: Sending funds
 * - **DONE**: Order completed
 * - **EXPIRED**: Order expired
 * - **EMERGENCY**: Emergency, customer choice required
 */

class Order {
    /**
     * Represents a FixedFloat Order.
     * Contains all order data from the API and methods to manage it.
     * @param {Object} orderData Raw order data from API.
     * @param {FixedFloat} ffInstance Instance of the FixedFloat API client.
     * 
     * @property {String} id Unique order identifier.
     * @property {String} token Security token for managing the order.
     * @property {OrderStatus} status Current order status.
     * @property {String} type Order type ("float" or "fixed").
     * @property {String} address The FixedFloat deposit address for the `from` currency.
     * @property {String} toAddress The recipient address for the `to` currency.
     * @property {String} [extraId] Optional MEMO or Destination Tag for `toAddress`.
     * @property {Object} from Details of the currency and amount being sent.
     * @property {String} from.ccy Currency code (e.g., "BTC").
     * @property {String} from.name Currency name (e.g., "Bitcoin").
     * @property {Number} from.amount The quantity of the `from` currency.
     * @property {Object} to Details of the currency and amount being received.
     * @property {String} to.ccy Currency code (e.g., "ETH").
     * @property {String} to.name Currency name (e.g., "Ethereum").
     * @property {Number} to.amount The quantity of the `to` currency.
     * @property {Number} used Order creation timestamp (Unix).
     * @property {Number} expire Order expiration timestamp (Unix).
     * @property {Number} remaining Time remaining until expiration (seconds).
     * // ... and other properties as returned by the API.
     */
    constructor(orderData, ffInstance) {
        if (!orderData || !ffInstance) {
            throw new Error('Order data and FixedFloat instance are required to create an Order object.');
        }
        this._ff = ffInstance;
        this._updateData(orderData);
    }

    _updateData(apiData) {
        const ffRef = this._ff;
        Object.keys(this).forEach(key => {
            if (key !== '_ff') delete this[key];
        });
        Object.assign(this, apiData);
        this._ff = ffRef;
    }

    /**
     * Refreshes the order data from the API.
     * @returns {Promise<Order>} This order instance with updated data.
     */
    async refresh() {
        if (!this.id || !this.token) {
            throw new Error('Order ID and token are missing, cannot refresh.');
        }
        const updatedData = await this._ff._fetchOrderData(this.id, this.token);
        this._updateData(updatedData);
        return this;
    }

    /**
     * Sets an emergency action for the order (EXCHANGE or REFUND).
     * @param {'EXCHANGE' | 'REFUND'} choice The emergency choice.
     * @param {String} [address] Refund address (required if choice is REFUND).
     * @returns {Promise<Object>} API response from setEmergency call.
     * @link [Official Docs: Emergency Action Choice](https://ff.io/api#method_emergency)
     */
    async setEmergency(choice, address) {
        if (!this.id || !this.token) {
            throw new Error('Order ID and token are missing for setEmergency.');
        }
        return await this._ff.setEmergency(this.id, this.token, choice, address);
    }

    /**
     * Subscribes to email notifications for this order.
     * @param {String} email Email address for notifications.
     * @returns {Promise<Object>} API response from setEmailNotification call.
     * @link [Official Docs: Subscribe to notification](https://ff.io/api#method_setemail)
     */
    async setEmailNotification(email) {
        if (!this.id || !this.token) {
            throw new Error('Order ID and token are missing for setEmailNotification.');
        }
        return await this._ff.setEmailNotification(this.id, this.token, email);
    }

    /**
     * Gets QR code images for this order.
     * @returns {Promise<Object>} API response containing QR code data.
     * @link [Official Docs: Images of QR codes](https://ff.io/api#method_qr)
     */
    async getQRCodes() {
        if (!this.id || !this.token) {
            throw new Error('Order ID and token are missing for getQRCodes.');
        }
        return await this._ff.getQRCodes(this.id, this.token);
    }
}

class FixedFloat {
    /**
     * Main API class
     * @param {String} apiKey API key
     * @param {String} secretKey Secret key
     * @description Get your pair of keys from https://fixedfloat.com/apikey
     */
    constructor(apiKey, secretKey) {
        if (!apiKey || !secretKey) throw new Error('Please provide an API and secret keys');
        this.baseURL = 'https://ff.io/api/v2/';
        this.apiKey = apiKey;
        this.secretKey = secretKey;
    }

    /**
     * Make a request to the FixedFloat API
     * @param {String} apiMethod API method name (e.g., 'ccies', 'price', 'order', 'create')
     * @param {Object} params Parameters to send in the request body (JSON)
     * @param {String} [reqMethod='POST'] HTTP request method - most API methods are POST
     * @private
     */
    async _request(apiMethod, params = {}, reqMethod = 'POST') {
        if (!apiMethod) throw new Error('Required param: apiMethod');

        const jsonData = JSON.stringify(params);
        const signature = crypto
            .createHmac('sha256', this.secretKey)
            .update(jsonData)
            .digest('hex');

        const headers = {
            'X-API-KEY': this.apiKey,
            'X-API-SIGN': signature,
            'Content-Type': 'application/json; charset=UTF-8',
        };

        try {
            const { data: responseData } = await axios({
                method: reqMethod,
                url: this.baseURL + apiMethod,
                headers: headers,
                data: jsonData,
            });

            if (responseData.code !== 0) {
                const errorMsg = responseData.msg || (responseData.data && responseData.data.message) || 'Unknown API error';
                throw new Error(`API Error ${responseData.code}: ${errorMsg}`);
            }
            return responseData.data;
        } catch (error) {
            if (error.response) {
                let errorData = error.response.data;
                let message = `Request failed: ${error.response.status} ${error.response.statusText}`;
                if (errorData && errorData.msg) {
                    message += ` - API Message: ${errorData.msg}`;
                } else if (typeof errorData === 'string') {
                    message += ` - Body: ${errorData}`;
                }
                throw new Error(message);
            }
            throw error;
        }
    }

    /**
     * Getting a list of all currencies that are available.
     * Internally calls the 'ccies' endpoint.
     * @link [Official Docs: Available currencies](https://ff.io/api#method_ccies)
     */
    async getCurrencies() {
        return await this._request('ccies');
    }

    /**
     * Information about a currency pair with a set amount of funds.
     * @param {Object} params Parameters for the price request.
     * @param {String} params.fromCcy Currency code to sell (e.g., "BTC"). API requires this.
     * @param {String} params.toCcy Currency code to buy (e.g., "ETH"). API requires this.
     * @param {Number} params.amount Amount to exchange. API requires this.
     * @param {String} [params.direction="from"] Defines which amount is fixed: 'from' or 'to'. API requires this. Library default: 'from'.
     * @param {'fixed'|'float'} [params.type="float"] Order type: 'fixed' or 'float'. API requires this. Library default: 'float'.
     * @link [Official Docs: Exchange rate](https://ff.io/api#method_price)
     */
    async getPrice({ fromCcy, toCcy, amount, direction = 'from', type = 'float' }) {
        if (!fromCcy || !toCcy || !amount) {
            throw new Error('Required params for getPrice: fromCcy, toCcy, amount');
        }
        const body = {
            fromCcy,
            toCcy,
            amount: parseFloat(amount),
            direction,
            type,
        };
        return await this._request('price', body);
    }
    
    /**
     * Fetches raw order data from the API. Internal use for Order class refresh.
     * @param {String} id Order ID
     * @param {String} token Security token of order
     * @returns {Promise<Object>} Raw order data from API
     * @link [Official Docs: Get order details](https://ff.io/api#method_order)
     */
    async _fetchOrderData(id, token) {
        if (!id || !token) throw new Error('Required params for _fetchOrderData: id, token');
        const body = { id, token };
        return await this._request('order', body);
    }

    /**
     * Receiving information about an order and returning an Order instance.
     * @param {String} id Order ID
     * @param {String} token Security token of order
     * @returns {Promise<Order>} Instance of Order class
     * @link [Official Docs: Get order details](https://ff.io/api#method_order)
     */
    async getOrder(id, token) {
        const orderData = await this._fetchOrderData(id, token);
        return new Order(orderData, this);
    }

    /**
     * Emergency Action Choice.
     * @param {String} id Order ID
     * @param {String} token Security token of order
     * @param {'EXCHANGE'|'REFUND'} choice The choice: EXCHANGE or REFUND
     * @param {String} [address] Refund address, required if choice="REFUND"
     * @link [Official Docs: Emergency Action Choice](https://ff.io/api#method_emergency)
     */
    async setEmergency(id, token, choice, address) {
        if (!id || !token || !choice) {
            throw new Error('Required params for setEmergency: id, token, choice');
        }
        if (choice === 'REFUND' && !address) {
            throw new Error('Address is required for REFUND choice in setEmergency');
        }
        const body = { id, token, choice };
        if (address) {
            body.address = address;
        }
        return await this._request('emergency', body);
    }

    /**
     * Creating an exchange order and returning an Order instance.
     * @param {Object} params Parameters for creating the order.
     * @param {String} params.fromCcy Currency code to sell (e.g., "BTC"). API requires this.
     * @param {String} params.toCcy Currency code to buy (e.g., "ETH"). API requires this.
     * @param {String} params.toAddress Destination address for the `toCcy`. API requires this. MEMO or Destination Tag for `toAddress` (optional).
     * @param {Number} params.amount Amount for the exchange. API requires this.
     * @param {String} [params.direction="from"] Defines which amount is fixed: 'from' or 'to'. API requires this. Library default: 'from'.
     * @param {'fixed'|'float'} [params.type="float"] Order type: 'fixed' or 'float'. API requires this. Library default: 'float'.
     * @param {String} [params.extraId] MEMO or Destination Tag for `toAddress` (optional).
     * @param {String} [params.refundAddress] Refund address in case of issues (optional).
     * @returns {Promise<Order>} Instance of Order class.
     * @link [Official Docs: Create order](https://ff.io/api#method_create)
     */
    async createOrder({ fromCcy, toCcy, toAddress, amount, direction = 'from', type = 'float', extraId, refundAddress, refundExtraId }) {
        if (!fromCcy || !toCcy || !toAddress || !amount) {
            throw new Error('Required params for createOrder: fromCcy, toCcy, toAddress, amount');
        }
        const body = {
            fromCcy,
            toCcy,
            toAddress,
            amount: parseFloat(amount),
            direction,
            type,
        };
        if (extraId) body.extraId = extraId;
        if (refundAddress) body.refundAddress = refundAddress;
        if (refundExtraId) body.refundExtraId = refundExtraId;
        const orderData = await this._request('create', body);
        return new Order(orderData, this);
    }

    /**
     * Getting an export file of exchange rates in XML format.
     * This request does not require API key/secret.
     * @param {'fixed'|'float'} type Type of rates: 'fixed' or 'float'
     * @link [Official Docs: XML export file of rates](https://ff.io/api#method_xmlexport)
     */
    async getRatesXML(type = 'float') {
        if (type !== 'fixed' && type !== 'float') {
            throw new Error('Invalid type for getRatesXML. Must be \'fixed\' or \'float\'.');
        }

        try {
            const { data } = await axios.get(`https://ff.io/rates/${type}.xml`);
            return data;
        } catch (error) {
            if (error.response) {
                throw new Error(`Failed to get rates XML: ${error.response.status} ${error.response.statusText}`);
            }
            throw error;
        }
    }

    /**
     * Subscribe to receive notifications by email about a change in the status of the selected order.
     * @param {String} id Order ID
     * @param {String} token Order security token
     * @param {String} email Email address for notifications
     * @link [Official Docs: Subscribe to notification](https://ff.io/api#method_setemail)
     */
    async setEmailNotification(id, token, email) {
        if (!id || !token || !email) {
            throw new Error('Required params for setEmailNotification: id, token, email');
        }
        const body = { id, token, email };
        return await this._request('setEmail', body);
    }

    /**
     * Getting a list of images of QR codes for an order.
     * @param {String} id Order ID
     * @param {String} token Order security token
     * @link [Official Docs: Images of QR codes](https://ff.io/api#method_qr)
     */
    async getQRCodes(id, token) {
        if (!id || !token) {
            throw new Error('Required params for getQRCodes: id, token');
        }
        const body = { id, token };
        return await this._request('qr', body);
    }
}

module.exports = FixedFloat;