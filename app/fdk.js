const { setupFdk } = require('@gofynd/fdk-extension-javascript/express');
const { SQLiteStorage } = require('@gofynd/fdk-extension-javascript/express/storage');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * TODO: Development vs Production Database Configuration
 * 
 * For development purposes, we are using SQLite as a simple file-based database
 * for extension session storage. However, before deploying to production:
 * 
 * 1. SQLite should be replaced with a more robust persistent database solution
 *    (e.g., PostgreSQL, MySQL, MongoDB)
 * 2. This is because SQLite:
 *    - Is not suitable for concurrent access
 *    - Has limited scalability
 *    - May cause issues in production environments
 * 
 * Reference: https://www.sqlite.org/whentouse.html
 * For more information about storage options in FDK extensions:
 * https://github.com/gofynd/fdk-extension-javascript?tab=readme-ov-file#custom-storage-class
 */

// ✅ Lazy load INSIDE the handler — avoids circular dependency
async function createRefundHandler(eventName, payload, companyId, applicationId) {
  console.log('[REFUND WEBHOOK RECEIVED]', {
    eventName,
    companyId,
    applicationId,
    merchant_refund_id: payload?.payload?.merchant_refund_id,
    order_id: payload?.payload?.order_id,
    payment_status: payload?.payload?.payment_status
  });

  // TODO: your business logic
}

const dbPath = path.join(process.cwd(), 'session_storage.db');
const sqliteInstance = new sqlite3.Database(dbPath);

// Initialize storage first
const storage = new SQLiteStorage(sqliteInstance, 'example-payment-extension-javascript');

// Initialize FDK extension
const fdkExtension = setupFdk({
  api_key: process.env.EXTENSION_API_KEY,
  api_secret: process.env.EXTENSION_API_SECRET,
  base_url: process.env.EXTENSION_BASE_URL,
  cluster: process.env.FP_API_DOMAIN,
  callbacks: {
    auth: async req => {
      console.log(`Auth request received for company: ${req.query.company_id}`);
      return `${req.extension.base_url}/company/${req.query.company_id}/credentials?application_id=${application_id}`;
    },
    uninstall: async () => {
      // Any clean up activity here
      console.log('Uninstalling extension');
    },
  },
  // Set debug to true to print all API calls and interactions with fdk-extension-javascript library
  // Useful for development and debugging. Set to false in production to reduce console noise
  debug: false,
  storage: storage,
  access_mode: 'offline',
  webhook_config: {
    api_path: '/api/v1/fynd-webhooks',     // ← your webhook endpoint
    notification_email: 'your@email.com',  // ← your email
    subscribe_on_install: true,
    subscribed_saleschannel: 'all',
    event_map: {
      'application/refund/refund_initiated': {   // ← refund event
        version: '1',
        handler: createRefundHandler,
        provider: 'rest'
      },
      'application/refund/refund_done': {
        version: '1',
        handler: createRefundHandler,
        provider: 'rest'
      }
    }
  }
});

module.exports = {
  fdkExtension,
}; 