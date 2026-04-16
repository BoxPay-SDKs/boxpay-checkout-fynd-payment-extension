const express = require('express');
const extensionCredsRouter = express.Router();

const {
  createSecretsHandler,
  getSecretsHandler,
} = require('../controllers/creds.controller');



/**
 * @route GET /company/:company_id/credentials/:app_id
 * @desc Fetch merchant credentials by company ID and app ID
 * @access Private (requires application ID verification)
 */
extensionCredsRouter.get(
  '/company/:company_id/credentials/:app_id',
  getSecretsHandler
);

/**
 * @route POST /company/:company_id/credentials/:app_id
 * @desc Create merchant credentials by company ID and app ID
 * @access Private (requires application ID verification)
 */
extensionCredsRouter.post(
  '/company/:company_id/credentials/:app_id',
  createSecretsHandler
);

module.exports = {
  extensionCredsRouter
};
