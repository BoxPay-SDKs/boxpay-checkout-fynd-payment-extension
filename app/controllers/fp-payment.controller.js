const axios = require('axios');
const PaymentModel = require('../models/payment.model');
const CredsModel = require('../models/creds.model');
const EncryptHelper = require('../utils/encrypt.util');

// Environment variables
const EXTENSION_BASE_URL = process.env.EXTENSION_BASE_URL;
const EXTENSION_API_SECRET = process.env.EXTENSION_API_SECRET;

// BoxPay API base URL (test environment)
const BOXPAY_BASE_URL = 'https://test-apis.boxpay.tech/v0';

// Payment mode constant
const PAYMENT_MODE = 'test';

// Payment status constants - sent in response to Fynd core API call
const paymentStatus = {
  STARTED: 'started',
  PENDING: 'pending',
  COMPLETE: 'complete',
  FAILED: 'failed',
};

// Refund status constants - sent in response to Fynd core API call
const refundStatus = {
  REFUND_INITIATED: 'refund_initiated',
  REFUND_PENDING: 'refund_pending',
  REFUND_DONE: 'refund_done',
  REFUND_FAILED: 'refund_failed',
  REFUND_REJECTED: 'refund_rejected',
  REFUND_DISPUTED: 'refund_disputed',
};

/**
 * Helper — fetch and decrypt merchant BoxPay credentials from SQLite
 * Returns { api_key, legal_entity, merchant_id }
 */
const getMerchantCreds = async (appId, companyId) => {
  const encryptedSecret = await CredsModel.getCreds(appId, companyId);
  if (!encryptedSecret) {
    throw new Error(
      'BoxPay credentials not configured for this merchant. Please set up API Key, Legal Entity and Merchant ID.'
    );
  }
  const decrypted = EncryptHelper.decrypt(EXTENSION_API_SECRET, encryptedSecret);
  return JSON.parse(decrypted);
};

/**
 * Map BoxPay payment status → Fynd payment status
 */
const mapBoxPayStatusToFynd = (boxpayStatus = '') => {
  const statusMap = {
    AUTHORIZED: paymentStatus.COMPLETE,
    CAPTURED:   paymentStatus.COMPLETE,
    SUCCESS:    paymentStatus.COMPLETE,
    FAILED:     paymentStatus.FAILED,
    CANCELLED:  paymentStatus.FAILED,
    DECLINED:   paymentStatus.FAILED,
    PENDING:    paymentStatus.PENDING,
    CREATED:    paymentStatus.STARTED,
    INITIATED:  paymentStatus.STARTED,
  };
  return statusMap[boxpayStatus.toUpperCase()] || paymentStatus.PENDING;
};

/**
 * Map BoxPay refund status → Fynd refund status
 */
const mapBoxPayRefundStatusToFynd = (boxpayStatus = '') => {
  const statusMap = {
    SUCCESS:    refundStatus.REFUND_DONE,
    COMPLETED:  refundStatus.REFUND_DONE,
    FAILED:     refundStatus.REFUND_FAILED,
    REJECTED:   refundStatus.REFUND_REJECTED,
    PENDING:    refundStatus.REFUND_PENDING,
    PROCESSING: refundStatus.REFUND_PENDING,
    INITIATED:  refundStatus.REFUND_INITIATED,
  };
  return statusMap[boxpayStatus.toUpperCase()] || refundStatus.REFUND_PENDING;
};

/**
 * @desc Initiate payment session with BoxPay
 * @route Called by Fynd when customer clicks Pay button
 *
 * Fynd Request Payload:
 * {
 *   gid:              string  — unique transaction ID
 *   order_id:         string  — merchant order ID
 *   amount:           number  — total amount (e.g. 576.27)
 *   currency:         string  — currency code (INR)
 *   customer_name:    string  — full name
 *   customer_email:   string  — email
 *   customer_contact: string  — phone number
 *   app_id:           string  — application ID
 *   company_id:       string  — company ID
 *   billing_address:  object  — billing address
 *   shipping_address: object  — shipping/delivery address
 *   success_url:      string  — redirect after successful payment
 *   cancel_url:       string  — redirect after failed/cancelled payment
 *   payment_methods:  array   — available payment methods
 * }
 *
 * Expected Response to Fynd:
 * {
 *   success:      boolean,
 *   redirect_url: string,  ← BoxPay checkout URL — Fynd redirects customer here
 *   gid:          string,
 * }
 */
exports.initiatePaymentToPGHandler = async (req, res, next) => {
  try {
    const requestPayload = req.body;
    console.log('LOG: Payload received from Fynd platform', requestPayload);

    const {
      gid,
      order_id,
      amount,
      currency,
      customer_name,
      customer_email,
      customer_contact,
      app_id,
      company_id,
      shipping_address,
      kind,
      fynd_platform_id
    } = requestPayload;

    // Store the full payment payload in SQLite for later reference
    await PaymentModel.storePayment(gid, requestPayload);

    // Fetch merchant's BoxPay credentials from SQLite
    const { api_key, legal_entity, merchant_id } = await getMerchantCreds(app_id, company_id);

    // Split customer full name into first and last name
    const nameParts = (customer_name || '').trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Format phone number — BoxPay requires +91XXXXXXXXXX format
    const phone = customer_contact
      ? `+91${String(customer_contact).replace(/^\+91/, '').replace(/\D/g, '')}`
      : null;

    const extensionSuccessUrl = `${EXTENSION_BASE_URL}/api/v1/payment_callback/${company_id}/${app_id}?gid=${gid}&status=success`;
    const extensionBackUrl = `${EXTENSION_BASE_URL}/api/v1/payment_callback/${company_id}/${app_id}?gid=${gid}&status=back`;
    const formattedAmount = String(Math.floor(Number(amount) / 100));

      

    // Build BoxPay session request payload
    const boxpayPayload = {
      context: {
        countryCode: 'IN',
        legalEntity: {
          code: legal_entity,           
        },
        orderId: fynd_platform_id,       // Merchant's order ID
        additionalMerchantReference : gid     // Fynd gID
      },
      paymentType: kind === 'sale' ? 'S' : '',                 
      money: {
        amount: formattedAmount,         // BoxPay expects amount as string
        currencyCode: currency || 'INR',
      },
      shopper: {
        firstName,
        lastName,
        phoneNumber: phone,
        email: customer_email,
        uniqueReference: shipping_address.user_id,
        deliveryAddress : {
          address1 : shipping_address.address,
          address2:shipping_address.area,
          city : shipping_address.city,
          state: shipping_address.state,
          countryCode: shipping_address.country_iso_code,
          postalCode: shipping_address.area_code
        }
      },
      // BoxPay will POST payment status updates to this URL (webhook)
      statusNotifyUrl: `${EXTENSION_BASE_URL}/api/v1/webhook/payment/${company_id}/${app_id}`,
      // BoxPay will redirect customer here if they cancel/go back
      frontendBackUrl: extensionBackUrl,
      // BoxPay will redirect customer here after successful payment
      frontendReturnUrl: extensionSuccessUrl,
    };

    console.log('LOG: Calling BoxPay session API for merchant_id:', merchant_id);
    console.log('LOG: BoxPay payload:', JSON.stringify(boxpayPayload, null, 2));

    // Call BoxPay session creation API
    // POST https://test-apis.boxpay.tech/v0/merchants/:merchantId/sessions
    const boxpayResponse = await axios.post(
      `${BOXPAY_BASE_URL}/merchants/${merchant_id}/sessions`,
      boxpayPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
        },
        timeout: 10000, // 10 second timeout
      }
    );

    const boxpayData = boxpayResponse.data;
    console.log('LOG: BoxPay session API response:', JSON.stringify(boxpayData, null, 2));

    // Extract checkout URL from BoxPay response
    const checkoutUrl =
      boxpayData?.redirectUrl     ||
      boxpayData?.redirect_url    ||
      boxpayData?.url             ||
      boxpayData?.data?.redirectUrl ||
      boxpayData?.data?.url;

    if (!checkoutUrl) {
      throw new Error(
        'BoxPay did not return a checkout URL. Response: ' + JSON.stringify(boxpayData)
      );
    }

    // Return checkout URL to Fynd
    // Fynd will redirect the customer to this BoxPay checkout page
    const platformResponse = {
      success: true,
      redirect_url: checkoutUrl,   // ← Customer gets redirected here
      gid,
    };

    console.log('LOG: Response sent to Fynd platform', platformResponse);
    return res.status(200).json(platformResponse);

  } catch (error) {
    console.error('LOG: Error in initiatePaymentToPGHandler:', error?.response?.data || error.message);

    if (error.response?.data) {
      return res.status(400).json({
        success: false,
        gid: req.body.gid,
        error: error.response.data.message || 'BoxPay API error occurred',
      });
    }
    next(error);
  }
};

/**
 * @desc Get payment status from BoxPay
 * @route Called by Fynd to check/poll payment status
 *
 * Fynd sends: gid (transaction ID) as URL param
 * We fetch status from BoxPay and map it to Fynd's expected format
 */
exports.getPaymentDetailsHandler = async (req, res, next) => {
  try {
    const { gid } = req.params;
    console.log('LOG: Request for get payment details', { gid });

    if (!gid) {
      throw new Error('Payment session ID (gid) is required');
    }

    // Fetch original payment payload from SQLite to get app_id & company_id
    const storedPayment = await PaymentModel.getPayment(gid);
    const appId = storedPayment?.app_id;
    const companyId = storedPayment?.company_id;

    // Fetch merchant's BoxPay credentials
    const { api_key, merchant_id } = await getMerchantCreds(appId, companyId);

    console.log('LOG: Fetching payment status from BoxPay for gid:', gid);

    // GET https://test-apis.boxpay.tech/v0/merchants/:merchantId/sessions/:token
    const boxpayResponse = await axios.get(
      `${BOXPAY_BASE_URL}/merchants/${merchant_id}/sessions/${gid}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
        },
        timeout: 10000,
      }
    );

    const boxpayData = boxpayResponse.data;
    console.log('LOG: BoxPay payment status response:', JSON.stringify(boxpayData, null, 2));

    // Map BoxPay status → Fynd status
    const rawStatus = boxpayData?.status || boxpayData?.data?.status || 'PENDING';
    const status = mapBoxPayStatusToFynd(rawStatus);

    const currency = boxpayData?.currency || storedPayment?.currency || 'INR';
    const amount = boxpayData?.amount || storedPayment?.amount || 0;
    const amountInPaise = Number(amount) * 100;
    const transactionId = boxpayData?.token || boxpayData?.transactionId || gid;

    // Build Fynd expected response format
    const responseData = {
      gid,
      order_details: {
        gid,
        amount: amountInPaise,
        status,
        currency,
        aggregator_order_details: boxpayData,
        aggregator: 'BoxPay',
      },
      status,
      currency,
      total_amount: amountInPaise,
      payment_details: [
        {
          gid,
          amount: amountInPaise,
          currency,
          payment_id: transactionId,
          mode: PAYMENT_MODE,
          success_url: storedPayment?.success_url || '',
          cancel_url: storedPayment?.cancel_url || '',
          amount_captured: status === paymentStatus.COMPLETE ? amountInPaise : 0,
          payment_methods: [{}],
          g_user_id: storedPayment?.customer_uid || '',
          aggregator_order_id: transactionId,
          status,
          created: String(Date.now()),
        },
      ],
    };

    console.log('LOG: Response for get Payment Details', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('LOG: Error in getPaymentDetailsHandler:', error?.response?.data || error.message);
    next(error);
  }
};

/**
 * @desc Initiate refund with BoxPay
 * @route POST /api/v1/payment_session/:gid/refund
 */
exports.createRefundHandler = async (req, res, next) => {
  try {
    const requestPayload = req.body;
    console.log('LOG: Request body for create refund', requestPayload);

    const {
      gid,
      request_id: requestId,
      amount,
      currency,
    } = requestPayload;

    // Fetch original payment from SQLite to get app_id & company_id
    const storedPayment = await PaymentModel.getPayment(gid);
    const appId = storedPayment?.app_id;
    const companyId = storedPayment?.company_id;

    // Fetch merchant's BoxPay credentials
    const { api_key, merchant_id } = await getMerchantCreds(appId, companyId);

    console.log('LOG: Initiating refund with BoxPay for gid:', gid);

    // POST https://test-apis.boxpay.tech/v0/merchants/:merchantId/sessions/:token/refunds
    // const boxpayResponse = await axios.post(
    //   `${BOXPAY_BASE_URL}/merchants/${merchant_id}/sessions/${gid}/refunds`,
    //   {
    //     amount: String(amount),
    //     currencyCode: currency || 'INR',
    //     refundReference: requestId,
    //     reason: 'Merchant initiated refund',
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       'Authorization': `Bearer ${api_key}`,
    //     },
    //     timeout: 10000,
    //   }
    // );

    // const boxpayData = boxpayResponse.data;
    // console.log('LOG: BoxPay refund response:', JSON.stringify(boxpayData, null, 2));

    // const refundId = boxpayData?.refundId || boxpayData?.id || requestId;
    // const refundUtr = boxpayData?.utr || boxpayData?.refundUtr || null;

    // // Store refund in SQLite
    // await PaymentModel.storeRefund(gid, {
    //   ...requestPayload,
    //   refund_id: refundId,
    //   refund_utr: refundUtr,
    // });

    // // Build Fynd expected response format
    // const responseData = {
    //   gid,
    //   aggregator_payment_refund_details: {
    //     status: refundStatus.REFUND_INITIATED,
    //     amount: Number(amount),
    //     currency: currency || 'INR',
    //     request_id: requestId,
    //     refund_utr: refundUtr,
    //     payment_id: refundId,
    //   },
    // };

    // console.log('LOG: Response for create refund', responseData);
    return res.status(404).json(responseData);

  } catch (error) {
    console.error('LOG: Error in createRefundHandler:', error?.response?.data || error.message);
    next(error);
  }
};

/**
 * @desc Get refund status from BoxPay
 * @route Called by Fynd to check refund status
 */
exports.getRefundDetailsHandler = async (req, res, next) => {
  try {
    const { gid } = req.params;
    console.log('LOG: Request for get refund details', { gid });

    if (!gid) {
      throw new Error('Refund session ID (gid) is required');
    }

    // Fetch stored refund & payment data from SQLite
    const refundPayload = await PaymentModel.getRefund(gid);
    const storedPayment = await PaymentModel.getPayment(gid);

    const appId = storedPayment?.app_id;
    const companyId = storedPayment?.company_id;

    // Fetch merchant's BoxPay credentials
    const { api_key, merchant_id } = await getMerchantCreds(appId, companyId);

    console.log('LOG: Fetching refund status from BoxPay for gid:', gid);

    // GET https://test-apis.boxpay.tech/v0/merchants/:merchantId/sessions/:token/refunds/:refundId
    const boxpayResponse = await axios.get(
      `${BOXPAY_BASE_URL}/merchants/${merchant_id}/sessions/${gid}/refunds/${refundPayload?.refund_id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
        },
        timeout: 10000,
      }
    );

    const boxpayData = boxpayResponse.data;
    console.log('LOG: BoxPay refund status response:', JSON.stringify(boxpayData, null, 2));

    // Map BoxPay refund status → Fynd refund status
    const rawStatus = boxpayData?.status || 'PENDING';
    const status = mapBoxPayRefundStatusToFynd(rawStatus);

    const amount = refundPayload?.amount || 0;
    const amountInPaise = Number(amount) * 100;
    const refundUtr = boxpayData?.utr || refundPayload?.refund_utr || null;
    const transactionId = boxpayData?.transactionId || refundPayload?.refund_id;

    // Build Fynd expected response format
    const responseData = {
      gid,
      aggregator_payment_refund_details: [
        {
          status,
          payment_id: transactionId,
          refund_utr: refundUtr,
          amount: amountInPaise,
          currency: refundPayload?.currency || 'INR',
          request_id: refundPayload?.request_id,
          reason: { description: 'item not needed anymore' },
          receipt_number: refundPayload?.refund_id,
        },
      ],
    };

    console.log('LOG: Response for get Refund Details', responseData);
    return res.status(200).json(responseData);

  } catch (error) {
    console.error('LOG: Error in getRefundDetailsHandler:', error?.response?.data || error.message);
    next(error);
  }
};