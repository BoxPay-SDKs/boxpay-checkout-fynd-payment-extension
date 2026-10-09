const { fdkExtension } = require('../fdk');
const crypto = require('crypto');
const CredsModel = require('../models/creds.model');
const PaymentModel = require('../models/payment.model');
const axios = require('axios');
const EncryptHelper = require('../utils/encrypt.util');

// Environment variables
const EXTENSION_API_SECRET = process.env.EXTENSION_API_SECRET;

// BoxPay API base URLs per environment — mirrors fp-payment.controller.js
const BOXPAY_URLS = {
  prod: 'https://apis.boxpay.in/v0',
  test: 'https://test-apis.boxpay.tech/v0',
};

const getMerchantCreds = async (appId, companyId) => {
  const encryptedSecret = await CredsModel.getCreds(appId, companyId);
  if (!encryptedSecret) throw new Error('Credentials not found');
  const decrypted = EncryptHelper.decrypt(EXTENSION_API_SECRET, encryptedSecret);
  const creds = JSON.parse(decrypted);
  return {
    ...creds,
    mode: creds.mode === 'test' ? 'test' : 'prod',
  };
};

const getBoxpayBaseUrl = (mode) => BOXPAY_URLS[mode] || BOXPAY_URLS.prod;

/**
 * @desc Handle redirect from BoxPay after payment
 * @route GET /api/v1/payment_callback/:company_id/:app_id
 * 
 * BoxPay calls this with:
 *   SUCCESS → ?gid=xxx&status=success&redirection_result=<token>
 *   BACK    → ?gid=xxx&status=back (with or without extra params)
 */
exports.paymentCallbackHandler = async (req, res) => {
  // F-09 fix: declare cancel_url with safe default before any async work
  let cancel_url = '/';

  try {
    const { company_id: companyId, app_id: appId } = req.params;
    const { gid, status, redirectionResult } = req.query;


    // Fetch stored payment data (has success_url and cancel_url)
    const storedPayment = await PaymentModel.getPayment(gid);
    if (!storedPayment) {
      return res.redirect('/payment-error');
    }

    const { success_url } = storedPayment;
    cancel_url = storedPayment.cancel_url || cancel_url;

    // If customer clicked back button → redirect to cancel_url
    if (status === 'back') {
      return res.redirect(cancel_url);
    }

    // For success → verify actual payment status with BoxPay
    // Don't trust the redirect alone — always verify with BoxPay API
    try {
      // F-07 fix: use per-merchant mode to select prod vs test URL
      const { api_key, merchant_id, mode } = await getMerchantCreds(appId, companyId);
      const boxpayBaseUrl = getBoxpayBaseUrl(mode);

      // Call BoxPay to get real payment status
      const boxpayResponse = await axios.post(
        `${boxpayBaseUrl}/merchants/${merchant_id}/transactions/inquiries`,
        { token: redirectionResult },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`,
          },
          timeout: 10000,
        }
      );

      const boxpayData = boxpayResponse.data;
      const boxpayStatus = boxpayData?.status?.status.toUpperCase();


      // Update Fynd with the payment status
      const response = await updateFyndPaymentStatus(gid, boxpayStatus, boxpayData, storedPayment);

      if (!response.success) {
        return res.redirect(cancel_url);
      }

      // Redirect customer based on verified status
      const successStatuses = ['AUTHORIZED', 'CAPTURED', 'SUCCESS', 'APPROVED'];
      if (successStatuses.includes(boxpayStatus)) {
        return res.redirect(success_url);
      } else {
        return res.redirect(cancel_url);
      }

    } catch (verifyError) {
      return res.redirect(cancel_url);
    }

  } catch (error) {
    return res.redirect(cancel_url);
  }
};

/**
 * @desc Handle BoxPay payment webhook (server to server)
 * @route POST /api/v1/webhook/payment/:company_id/:app_id
 * 
 * BoxPay sends this asynchronously when payment status changes
 * This is more reliable than the redirect callback
 */
exports.processPaymentWebhookHandler = async (req, res) => {
  try {
    const { company_id: companyId, app_id: appId } = req.params;
    const webhookData = req.body;  

    const gid = webhookData?.additionalMerchantReference;


    if (!gid) {
      return res.status(404).json({ success: false, message : 'No gid (fynd transaction ID) found in webhook payload' }); // returning error to BoxPay
    }


    const storedPayment = await PaymentModel.getPayment(gid);
    if (!storedPayment) {
      return res.status(404).json({ success: false, message : `Payment not found for gid: ${gid}` });
    }

    const boxpayStatus = (webhookData?.status?.status).toUpperCase();

    let response;


    if(webhookData?.status?.operation?.toLowerCase().includes('refund')) {
      // Add this temporarily
// const platformClient = await fdkExtension.getPlatformClient(companyId);
// const appClient = platformClient.application(appId);

// // Get all methods on Payment object
// const paymentProto = Object.getOwnPropertyNames(Object.getPrototypeOf(appClient.payment));
// console.log('LOG: Payment methods:', JSON.stringify(paymentProto, null, 2));
      // response = {success : true, message : 'message'}
      // response = await updateFyndRefundStatus(gid, boxpayStatus, webhookData, storedPayment);
    } else {
       // Update Fynd with the payment status
      response = await updateFyndPaymentStatus(gid, boxpayStatus, webhookData, storedPayment);
    }

    if(!response.success) {
      return res.status(422).json({ success: false, message : `Fynd updating webhook response ${JSON.stringify(response, null, 2)}` });
    }

    // Always return 200 to BoxPay to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(422).json({ success: false, message : `Error in processPaymentWebhookHandler ${error.message}` });
  }
};

// /**
//  * @desc Handle BoxPay refund webhook
//  * @route POST /api/v1/webhook/refund/:company_id/:app_id
//  */
// exports.processRefundWebhookHandler = async (req, res) => {
//   try {
//     const { company_id: companyId, app_id: appId } = req.params;
//     const webhookData = req.body;

//     console.log('LOG: Refund webhook received from BoxPay:', JSON.stringify(webhookData, null, 2));

//     const gid = webhookData?.additionalMerchantReference

//     if (!gid) {
//       console.error('LOG: No gid found in webhook payload');
//       return res.status(200).json({ success: true }); // returning error to BoxPay
//     }

//     const refundStatusMap = {
//       SUCCESS:    'APPROVED',
//       FAILED:     'FAILED',
//       PROCESSING: 'POSTED',
//       FAILED : 'REJECTED'
//     };

//     const boxpayStatus = webhookData?.status?.status.toUpperCase();
//     const fyndRefundStatus = refundStatusMap[boxpayStatus] || 'refund_pending';

//     // Update Fynd with refund status
//     await updateFyndRefundStatus(gid, fyndRefundStatus, webhookData);

//     return res.status(200).json({ success: true });

//   } catch (error) {
//     console.error('LOG: Error in processRefundWebhookHandler:', error.message);
//     return res.status(200).json({ success: true });
//   }
// };

function generateChecksum(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Helper — Update Fynd Platform with payment status
 * Uses Fynd's updatePaymentSession API
 */
const updateFyndPaymentStatus = async (gid, boxpayStatus, boxpayData, storedPayment) => {
  try {
    const statusMap = {
      APPROVED: 'complete',
      AUTHORIZED: 'complete',
      CAPTURED:   'complete',
      SUCCESS:    'complete',
      FAILED:     'failed',
      CANCELLED:  'failed',
      REJECTED:   'failed',
      PENDING:    'pending',
    };


    const fyndStatus = statusMap[boxpayStatus] || 'pending';
    const appId = storedPayment?.app_id;
    const companyId = storedPayment?.company_id;
    

    const { success_url, cancel_url } = storedPayment;

    // Get Fynd platform client
    const platformClient = await fdkExtension.getPlatformClient(companyId);
    const amount = boxpayData?.money?.amount * 100

    const payload = {
        gid: gid,
        status: fyndStatus,
        total_amount : amount,
        currency: storedPayment?.currency || 'INR',
    
        payment_details: [
          {
            payment_id: boxpayData?.transactionId,
            aggregator_order_id: boxpayData?.orderId || storedPayment?.order_id,
            gid: gid,
    
            status: fyndStatus,
            g_user_id: storedPayment?.user_id || "123",
    
            amount: amount,
            amount_captured: amount,
            currency: storedPayment?.currency || 'INR',
            mode: "online",
            payment_methods: [
              {
                code: boxpayData?.paymentMethod?.type,
                name: boxpayData?.paymentMethod?.brand
              }
            ],
            success_url: success_url,
            cancel_url: cancel_url
          }
        ],
    
        order_details: {
          gid: gid,
          status: fyndStatus,
          amount: amount,
          currency: storedPayment?.currency || 'INR',
    
          aggregator: "fynd",
    
          aggregator_order_details: {
            aggregator_order_id: boxpayData?.orderId,
            amount: amount,
            currency: storedPayment?.currency || 'INR',
            aggregator: "boxpay",
            status: fyndStatus
          }
      }
    }

    const checksum = generateChecksum(payload, EXTENSION_API_SECRET);



    // Call Fynd's updatePaymentSession API
    const response = await platformClient.application(appId).payment.updatePaymentSession({
      gid : gid,
      body: {
        ...payload,
        checksum
      }
    });


    return response;
  } catch (error) {
    return {success : false, message : error.message}
  }
};

/**
 * Helper — Update Fynd Platform with refund status
 */
const updateFyndRefundStatus = async (gid, boxpayStatus, webhookData, storedPayment) => {
  try {
    const refundStatusMap = {
      APPROVED:    'APPROVED',
      FAILED:     'FAILED',
      POSTED: 'POSTED',
      REJECTED : 'REJECTED'
    };
    const fyndStatus = refundStatusMap[boxpayStatus] || 'pending';
    const companyId = storedPayment?.company_id;
    const appId = storedPayment?.app_id;
    const currency = webhookData?.money?.currencyCode
    const amount = webhookData?.money?.amount
    const { success_url, cancel_url } = storedPayment;
    const platformClient = await fdkExtension.getPlatformClient(companyId);
    const payload = {
      gid:gid,
      // requestId: webhookData?.operationId,  // BoxPay refund/operation ID
      status: fyndStatus,
      currency:currency,
      total_amount:amount,
      refund_details: [
        {
          status: fyndStatus,
          amount:amount,
          currency:currency,
          payment_id: webhookData?.transactionId,
          request_id: webhookData?.operationId,
          created : webhookData?.timestamp
        }
      ],
      payment_details: {
        payment_id: webhookData?.transactionId,
        aggregator_order_id: webhookData?.orderId || storedPayment?.order_id,
        gid: gid,

        status: fyndStatus,
        g_user_id: storedPayment?.user_id || "123",

        amount: amount,
        amount_captured: amount,
        currency: storedPayment?.currency || 'INR',
        mode: "online",
        payment_methods: [
          {
            code: webhookData?.paymentMethod?.type,
            name: webhookData?.paymentMethod?.brand
          }
        ],
        success_url: success_url,
        cancel_url: cancel_url
      },
    }
    const checksum = generateChecksum(payload, EXTENSION_API_SECRET);
    const response = await platformClient.application(appId)
      .payment
      .updateRefundSession({   // ← This creates the refund on Fynd
        gid:gid,
        requestId: webhookData?.operationId,
        body: {
          ...payload,
          checksum
        }
      });

    // Add Fynd updateRefundSession API call here when needed
    return response;
  } catch (error) {
    return {success : false, message : error.message}
  }
};
