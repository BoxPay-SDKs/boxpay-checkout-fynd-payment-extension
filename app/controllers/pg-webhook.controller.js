const { fdkExtension } = require('../fdk');
const crypto = require('crypto');
const CredsModel = require('../models/creds.model');
const PaymentModel = require('../models/payment.model');
const axios = require('axios');
const EncryptHelper = require('../utils/encrypt.util');

// Environment variables
const EXTENSION_API_SECRET = process.env.EXTENSION_API_SECRET;
const BOXPAY_BASE_URL = 'https://test-apis.boxpay.tech/v0';

const getMerchantCreds = async (appId, companyId) => {
  const encryptedSecret = await CredsModel.getCreds(appId, companyId);
  if (!encryptedSecret) throw new Error('Credentials not found');
  const decrypted = EncryptHelper.decrypt(EXTENSION_API_SECRET, encryptedSecret);
  return JSON.parse(decrypted);
};

/**
 * @desc Handle redirect from BoxPay after payment
 * @route GET /api/v1/payment_callback/:company_id/:app_id
 * 
 * BoxPay calls this with:
 *   SUCCESS → ?gid=xxx&status=success&redirection_result=<token>
 *   BACK    → ?gid=xxx&status=back (with or without extra params)
 */
exports.paymentCallbackHandler = async (req, res) => {
  try {
    const { company_id: companyId, app_id: appId } = req.params;
    const { gid, status, redirectionResult } = req.query;

    console.log('LOG: Payment callback received', { gid, status, redirectionResult });

    // Fetch stored payment data (has success_url and cancel_url)
    const storedPayment = await PaymentModel.getPayment(gid);
    if (!storedPayment) {
      console.error('Payment not found for gid:', gid);
      return res.redirect('/payment-error');
    }

    const { success_url, cancel_url } = storedPayment;

    // If customer clicked back button → redirect to cancel_url
    if (status === 'back') {
      console.log('LOG: Customer clicked back, redirecting to cancel_url');
      return res.redirect(cancel_url);
    }

    // For success → verify actual payment status with BoxPay
    // Don't trust the redirect alone — always verify with BoxPay API
    try {
      const { api_key, merchant_id } = await getMerchantCreds(appId, companyId);

      // Call BoxPay to get real payment status
      const boxpayResponse = await axios.post(
        `${BOXPAY_BASE_URL}/merchants/${merchant_id}/transactions/inquiries`,
        {
          token : redirectionResult
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api_key}`,
          },
          timeout: 10000,
        }
      );

      const boxpayData = boxpayResponse.data;
      const boxpayStatus = boxpayData?.status?.status.toUpperCase()

      console.log('LOG: BoxPay payment status verified:', boxpayData);

      // Update Fynd with the payment status
      const response = await updateFyndPaymentStatus(gid, boxpayStatus, boxpayData, storedPayment);

      if(!response.success) {
        console.log('LOG: Payment failed/pending, redirecting to cancel_url', JSON.stringify(response, null, 2));
        return res.redirect(cancel_url);
      }
      // Redirect customer based on verified status
      const successStatuses = ['AUTHORIZED', 'CAPTURED', 'SUCCESS', 'APPROVED'];
      if (successStatuses.includes(boxpayStatus)) {
        console.log('LOG: Payment successful, redirecting to success_url');
        console.error('LOG: Success url:', success_url);
        return res.redirect(success_url);
      } else {
        console.log('LOG: Payment failed/pending, redirecting to cancel_url');
        console.error('LOG: Cancel url:', cancel_url);
        return res.redirect(cancel_url);
      }

    } catch (verifyError) {
      console.error('LOG: Error verifying payment status:', verifyError.message);
      // If verification fails, redirect to cancel_url to be safe
      return res.redirect(cancel_url);
    }

  } catch (error) {
    console.error('LOG: Error in paymentCallbackHandler:', error.message);
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

    console.log('LOG: Payment webhook received from BoxPay:', JSON.stringify(webhookData, null, 2));

    
    const gid = webhookData?.additionalMerchantReference;

    if (!gid) {
      console.error('LOG: No gid found in webhook payload');
      return res.status(404).json({ success: false, message : 'No gid (fynd transaction ID) found in webhook payload' }); // returning error to BoxPay
    }

    const storedPayment = await PaymentModel.getPayment(gid);
    if (!storedPayment) {
      console.error('LOG: Payment not found for gid:', gid);
      return res.status(404).json({ success: false, message : `Payment not found for gid: ${gid}` });
    }

    const boxpayStatus = (webhookData?.status?.status).toUpperCase();

    // Update Fynd with the payment status
    const response = await updateFyndPaymentStatus(gid, boxpayStatus, webhookData, storedPayment);
    console.error('LOG: Response of update fynd payment session api:', JSON.stringify(response, null, 2));

    if(!response.success) {
      console.error('LOG: Response of update fynd payment session api:', JSON.stringify(response, null, 2));
      return res.status(422).json({ success: false, message : `Fynd updating webhook response ${response}` });
    }

    // Always return 200 to BoxPay to acknowledge receipt
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('LOG: Error in processPaymentWebhookHandler:', error.message);
    return res.status(422).json({ success: false, message : `Error in processPaymentWebhookHandler ${error.message}` });
  }
};

/**
 * @desc Handle BoxPay refund webhook
 * @route POST /api/v1/webhook/refund/:company_id/:app_id
 */
exports.processRefundWebhookHandler = async (req, res) => {
  try {
    const { company_id: companyId, app_id: appId } = req.params;
    const webhookData = req.body;

    console.log('LOG: Refund webhook received from BoxPay:', JSON.stringify(webhookData, null, 2));

    const gid = webhookData?.additionalMerchantReference

    if (!gid) {
      console.error('LOG: No gid found in webhook payload');
      return res.status(200).json({ success: true }); // returning error to BoxPay
    }

    const refundStatusMap = {
      SUCCESS:    'refund_done',
      COMPLETED:  'refund_done',
      FAILED:     'refund_failed',
      PENDING:    'refund_pending',
      PROCESSING: 'refund_pending',
    };

    const boxpayStatus = (webhookData?.status || '').toUpperCase();
    const fyndRefundStatus = refundStatusMap[boxpayStatus] || 'refund_pending';

    // Update Fynd with refund status
    await updateFyndRefundStatus(gid, fyndRefundStatus, webhookData);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('LOG: Error in processRefundWebhookHandler:', error.message);
    return res.status(200).json({ success: true });
  }
};

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
    

    console.log(`LOG: Updating Fynd payment status → gid: ${gid}, status: ${fyndStatus}`);
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


    console.log('udpate payment session api payload', JSON.stringify(payload, null, 2));

    // Call Fynd's updatePaymentSession API
    const response = await platformClient.application(appId).payment.updatePaymentSession({
      gid : gid,
      body: {
        ...payload,
        checksum
      }
    });

    console.log(`LOG: Fynd update payment session api response → ${JSON.stringify(response, null, 2)}`)

    console.log(`LOG: Fynd payment status updated successfully → ${fyndStatus}`);
    return response;
  } catch (error) {
    console.error('LOG: Error updating Fynd payment status:', error.message);
    return {success : false, message : error.message}
  }
};

/**
 * Helper — Update Fynd Platform with refund status
 */
const updateFyndRefundStatus = async (gid, fyndRefundStatus, webhookData) => {
  try {
    console.log(`LOG: Updating Fynd refund status → gid: ${gid}, status: ${fyndRefundStatus}`);
    // Add Fynd updateRefundSession API call here when needed
    console.log(`LOG: Fynd refund status updated → ${fyndRefundStatus}`);
  } catch (error) {
    console.error('LOG: Error updating Fynd refund status:', error.message);
  }
};
