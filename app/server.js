const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const path = require('path');
const serveStatic = require("serve-static");
const { readFileSync } = require('fs');
const helmet = require('helmet');
const cors = require('cors');

// Environment variables
const NODE_ENV = process.env.NODE_ENV;
const BASE_PATH = process.env.BASE_PATH;
const EXTENSION_BASE_URL = process.env.EXTENSION_BASE_URL;

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

// F-03: Security headers via Helmet
app.use(helmet());

// F-03: CORS — allow only Fynd origins and the extension's own URL
const allowedOrigins = [
  /\.fynd\.com$/,
  /\.fyndx\d+\.de$/,
];
if (EXTENSION_BASE_URL) allowedOrigins.push(EXTENSION_BASE_URL);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true);
    const allowed = allowedOrigins.some(pattern =>
      typeof pattern === 'string' ? pattern === origin : pattern.test(origin)
    );
    allowed
      ? callback(null, true)
      : callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

app.use(cookieParser('ext.session'));

app.get(`${BASE_PATH}/healthz`, (req, res) => {
  res.status(200).json({ status: 'ok' });
});
app.use(bodyParser.json({
  limit: '2mb',
  verify: (req, res, buf) => {
    req.rawBody = buf; // ← preserve raw body for signature verification
  }
}));

app.post(`${BASE_PATH}/api/v1/fynd-webhooks`, async (req, res) => {
  try {
    await fdkExtension.webhookRegistry.processWebhook(req);
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false });
  }
});

app.use(bodyParser.urlencoded({ extended: false }));
// Serve static files from the React dist directory
app.use(serveStatic(STATIC_PATH, { index: false }));

// ✅ Fix — registers /payment-ext/fp/auth
app.use(BASE_PATH || '/', fdkExtension.fdkHandler);

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
app.get(`${BASE_PATH}/api/v1/payment_callback/:company_id/:app_id`, paymentCallbackHandler);
app.post(`${BASE_PATH}/api/v1/webhook/payment/:company_id/:app_id`, processPaymentWebhookHandler);

// Routes mounted on platformApiRoutes will have fdkSession middleware attached to the request object,
// providing access to authenticated session data and platform context for secure API endpoints.
const { platformApiRoutes } = fdkExtension;

// These protected routes will be called by the extension UI
platformApiRoutes.use('/v1', extensionCredsRouter);
app.use(`${BASE_PATH}/protected`, platformApiRoutes);

app.use(errorHandler);

// Catch-all route to serve the React app
app.get(`${BASE_PATH}/*`, (req, res) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(readFileSync(path.join(STATIC_PATH, "index.html")));
});

module.exports = app;
