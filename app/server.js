const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const serveStatic = require("serve-static");
const { readFileSync } = require('fs');

// Environment variables
const NODE_ENV = process.env.NODE_ENV;

const STATIC_PATH = NODE_ENV === 'production'
  ? path.join(process.cwd(), 'frontend', 'public', 'dist')
  : path.join(process.cwd(), 'frontend');

const { fdkExtension } = require('./fdk');
const errorHandler = require('./middleware/error.middleware');
const { extensionCredsRouter } = require('./routes/creds.router');
const { PaymentService } = require('./services/payment.service');
const { CredsService } = require('./services/creds.service');
const {
  initiatePaymentToPGHandler,
  getPaymentDetailsHandler,
  createRefundHandler,
  getRefundDetailsHandler,
} = require('./controllers/fp-payment.controller');
const {
  paymentCallbackHandler,
  processPaymentWebhookHandler,
  processRefundWebhookHandler,
} = require('./controllers/pg-webhook.controller');
const {
  checkPaymentReadinessHandler,
} = require('./controllers/creds.controller');

const app = express();

app.use(cookieParser('ext.session'));

app.get('/healthz', (req, res) => {
  console.log('LOG: Healthz page called', req);
  res.status(200).json({ status: 'ok' });
});
app.use(
  bodyParser.json({
    limit: '2mb',
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use(fdkExtension.fdkHandler);

// Initialize payment service with existing handlers
const paymentService = new PaymentService({
  initiatePaymentToPG: initiatePaymentToPGHandler,
  getPaymentDetails: getPaymentDetailsHandler,
  createRefund: createRefundHandler,
  getRefundDetails: getRefundDetailsHandler
});

// Initialize credentials service with existing handlers
const credsService = new CredsService({
  checkPaymentReadiness: checkPaymentReadinessHandler
});

// Register service routes
paymentService.registerRoutes(app);
credsService.registerRoutes(app);

// Payment Gateway webhook routes
app.get('/api/v1/payment_callback/:company_id/:app_id', paymentCallbackHandler);
app.post('/api/v1/webhook/payment/:company_id/:app_id', processPaymentWebhookHandler);
app.post('/api/v1/fynd-webhooks', async (req, res) => {
  try {
    await fdkExtension.webhookRegistry.processWebhook(req);
    console.log(`Log:Webhooks received in api/vi/fynd-webhooks ${JSON.stringify(req, null, 2)}`)
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('LOG: Webhook processing error:', err);
    return res.status(400).json({ success: false });
  }
});

// Routes mounted on platformApiRoutes will have fdkSession middleware attached to the request object,
// providing access to authenticated session data and platform context for secure API endpoints.
const { platformApiRoutes } = fdkExtension;

// These protected routes will be called by the extension UI
platformApiRoutes.use('/v1', extensionCredsRouter);
app.use('/protected', platformApiRoutes);

app.use(errorHandler);

// Catch-all route to serve the React app
app.get('*', (req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

module.exports = app;
