const EncryptHelper = require('../utils/encrypt.util');
const CredsModel = require('../models/creds.model');

// Environment variables
const EXTENSION_API_SECRET = process.env.EXTENSION_API_SECRET;

const CREDENTIAL_FIELDS = [
  {
    slug: 'api_key',
    name: 'API Key',
    required: true,
    display: true,
    placeholder: 'Enter your BoxPay API Key',
    description: 'Your secret API key from the BoxPay dashboard',
  },
  {
    slug: 'legal_entity',
    name: 'Legal Entity',
    required: true,
    display: true,
    placeholder: 'e.g. boxpay-india',
    description: 'Legal entity identifier provided by BoxPay',
  },
  {
    slug: 'merchant_id',
    name: 'Merchant ID',
    required: true,
    display: true,
    placeholder: 'Enter your BoxPay Merchant ID',
    description: 'Your unique merchant identifier from the BoxPay dashboard',
  },
];

/**
 * @desc Create merchant credentials
 * @route POST /api/v1/secrets
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parameters from the URL
 * @param {string} req.params.app_id - Application ID
 * @param {Object} req.fdkSession - Session object containing company_id
 * @param {Object} req.body - Request body
 * @param {Array} req.body.data - Array of credentials data
 * @param {Object} res - Express response object
 */
exports.createSecretsHandler = async (req, res) => {
  try {
    const { app_id: appId } = req.params;
    const { company_id: companyId } = req.fdkSession;

    // Validate required parameters
    if (!appId || !companyId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing app_id or company_id' });
    }

    const creds = req.body.data;

    // Validate creds data
    if (!Array.isArray(creds) || creds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid or empty credentials array' });
    }

    // Prepare data object
    const data = {};
    creds.forEach(cred => {
      if (cred.slug && cred.value) {
        data[cred.slug] = cred.value;
      }
    });

    // Encrypt the credentials
    const encryptedSecret = EncryptHelper.encrypt(
      EXTENSION_API_SECRET,
      JSON.stringify(data)
    );

    // Save the encrypted secrets in SQLite
    await CredsModel.storeCreds(appId, companyId, encryptedSecret);

    // Construct response
    const response = {
      success: true,
      app_id: appId,
      is_active: true,
      message: 'Secrets successfully updated',
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in createSecretsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * @desc Get merchant credentials
 * @route GET /api/v1/secrets
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parameters from the URL
 * @param {string} req.params.app_id - Application ID
 * @param {Object} req.fdkSession - Session object containing company_id
 * @param {Object} res - Express response object
 */
exports.getSecretsHandler = async (req, res) => {
  try {
    const { app_id: appId } = req.params;
    const { company_id: companyId } = req.fdkSession;

    // Fetch encrypted secrets from SQLite
    const encryptedSecret = await CredsModel.getCreds(appId, companyId);

    // If no secrets are found, return default credential fields
    if (!encryptedSecret) {
      return res.status(200).json({
        success: true,
        is_active: false,
        app_id: appId,
        data: CREDENTIAL_FIELDS,
      });
    }

    // Decrypt the secrets and construct the response
    let secrets = EncryptHelper.decrypt(EXTENSION_API_SECRET, encryptedSecret);
    secrets = JSON.parse(secrets);

    const creds = CREDENTIAL_FIELDS.map(field => ({
      ...field,
      value: secrets[field.slug],
    }));

    const responseData = {
      success: true,
      app_id: appId,
      is_active: true,
      data: creds,
    };
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in getSecretsHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

/**
 * @desc Check if payment processing is ready by verifying secrets existence
 * @route GET /api/v1/payment-readiness
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} req.params - Parameters from the URL
 * @param {string} req.params.app_id - Application ID
 * @param {Object} res - Express response object
 */
exports.checkPaymentReadinessHandler = async (req, res) => {
  try {
    const { app_id: appId } = req.params;

    // Validate required parameters
    if (!appId) {
      return res
        .status(400)
        .json({ success: false, message: 'Missing app_id' });
    }

    // Check if secrets exist in SQLite
    const hasCreds = await CredsModel.checkCredsExist(appId);

    const responseData = {
      success: true,
      application_id: appId,
      is_active: hasCreds,
      data: [], // Empty list added for now, will be removed in future releases
      message: hasCreds ? 'BoxPay credentials configured. Payment processing is ready.' : 'BoxPay credentials not configured. Please enter API Key, Legal Entity and Merchant ID.'
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in checkPaymentReadinessHandler:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
}; 