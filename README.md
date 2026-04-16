# 🚀 Payment Extension Boilerplate for Fynd Platform

<p align="center">
  <a target="_blank" href="https://partners.fynd.com/help/docs/partners/getting-started/overview">
    <img src="https://cdn.pixelbin.io/v2/broken-limit-7ed062/original/Fynd_Extensions.png" alt="Fynd Platform Extension" />
  </a>
</p>

## Overview

This boilerplate provides a starting point for integrating payment gateways with the Fynd Platform, enabling merchants to process payments seamlessly. The integration facilitates the installation and activation of payment extensions, allowing for a smooth transaction process for both merchants and customers.

## 🎉 Getting started

Relation of Extensions with Fynd Platform.

- Forward payment
  ![Forward payment](https://cdn.pixelbin.io/v2/odd-glade-8daf8e/original/pbp.drawio.png)

- Get payment status
  ![Get payment status](https://cdn.pixelbin.io/v2/doc/original/payment_extension/get_payment_status.png)

- Refund payment
  ![Refund payment](https://cdn.pixelbin.io/v2/doc/original/payment_extension/refund_flow.png)

- Get refund status
  ![Get refund status](https://cdn.pixelbin.io/v2/doc/original/payment_extension/get_refund_status.png)

## 🔗 Quick Links

| [🌐 Fynd Platform](https://platform.fynd.com/) | [🤝 Fynd Partners](https://partners.fynd.com/) | [📚 Documentation](https://partners.fynd.com/help/docs/partners/getting-started/overview) |

## 🛠️ Prerequisites

Before setting up the extension, make sure you have the following installed:

- [Node.js](https://nodejs.org/en/download/package-manager) : >= v16.x.x

---

## 📦 Project Setup

This guide provides a step-by-step process for building and setting up a payment extension, with two main approaches depending on your preferred technology stack.

## Table of Contents

- [Approach to Building Your Payment Extension](#approach-to-building-your-payment-extension)
  - [Option 1: Using Node + React Payment Extension Template](#option-1-using-node--react-payment-extension-template)
- [Setting Up in the Fynd Partners Panel](#setting-up-in-the-fynd-partners-panel)
  - [Step 1: Register on the Partners Panel](#step-1-register-on-the-partners-panel)
  - [Step 2: Create a New Payment Extension](#step-2-create-a-new-payment-extension)
  - [Step 3: Install Your Payment Extension](#step-3-install-your-payment-extension)
  - [Step 4: Configure the Extension](#step-4-configure-the-extension)
  - [Step 5: Access Extension Credentials](#step-5-access-extension-credentials)
  - [Step 6: Complete the Setup](#step-6-complete-the-setup)
- [How It Works](#how-it-works)
- [Security and Best Practices](#security-and-best-practices)

---

## Approach to Building Your Payment Extension

### Option 1: Using Node + React Payment Extension Template

For those using Node and React, a pre-implemented template is available, which includes:

- OAuth support for authentication
- Required endpoints for processing requests
- Frontend code for collecting payment gateway credentials from merchants

---

## Setting Up in the Fynd Partners Panel

### Step 1: Register on the Partners Panel

- Register on the Fynd Partners Panel.
- After registration, you can join an existing Partner Organization or create a new one.

### Step 2: Create a New Payment Extension

- Once you're part of an organization, navigate to **Extension > Create Extension**.
- Choose **Start from scratch**, select **Extension Type** as **Payments**, fill in the required details, and click **Create Extension**.

### Step 3: Install Your Payment Extension

- Go to **Sales Channel > Settings > Cart & Payments > Payments > General Settings > Payment Options > Add Payment Gateway**.
- Find your new extension under **Add Payment Gateway**, select it, and install it.

### Step 4: Configure the Extension

- In the **Payment Options** section, click on your extension.
- Configure the extension for web, iOS, or Android as per your requirements.

### Step 5: Access Extension Credentials

- Click the three dots in the top-right corner (near the save button) and select **Credentials** from the dropdown.
- The extension UI will appear, allowing you to input the necessary credentials.

### Step 6: Complete the Setup

- Fill in the required credentials.

### Step 7: Activate payment mode

- After the extension is set up successfully, the payment settings page will display it as inactive.
- Click on your extension.
- Activate the payment mode for your preferred device.
- 🎊 Your payment extension is now fully configured and ready for use! 🎊

---

## How It Works

Merchants can easily install and activate the payment extension on their Fynd Platform. During checkout, customers will see the payment options provided by the extension. Currently, the Fynd Platform supports a standard checkout flow where customers are redirected to the payment gateway's hosted page to complete their transactions.

---

## Security and Best Practices

- **Verifying API Calls**: Use checksums generated with your Extension API Secret to secure communications between the Fynd Platform and your payment extension.
- **Idempotency**: Ensure your extension supports idempotency to prevent duplicate transactions and provide a consistent experience for buyers.
- **Environment files**: Never commit `.env` or any file that contains real environment variables and secrets; use `.env.example` (with placeholder values only) for documentation in the repository.

For more detailed examples and additional languages, refer to the provided guides.

---

## Congratulations!

You have successfully set up your payment extension on the Fynd platform.

### 🎉 Local Setup

1. **📁 Use Git to clone the repository to your local machine and navigate into the project directory.**

   ```bash
   git clone https://github.com/gofynd/payment-extension-boilerplate.git
   ```

2. **📦 Install Backend Dependencies.**

   Ensure you have Node.js (v16.x.x or above) installed.

   ```bash
   npm install
   ```

3. **📦 Install Frontend Dependencies.**

   ```bash
   cd web
   npm install
   ```

4. **🔧 Create build of frontend React project.**

   ```bash
   npm run build
   ```

5. **🛠️ Configure Environment Variables.**

   Open the `app/config.js` file in your project directory. Update the `EXTENSION_API_KEY` and `EXTENSION_API_SECRET` environment variables in `api_key` and `api_secret` with the values obtained from the Partners Panel. These should be set as the default values for the `config` variables.

   This table includes the top-level keys and their subkeys, along with their properties, descriptions, formats, default values, environment variables.

| Field                            | Documentation         | Format    | Default Value                  | Environment Variable        |
| -------------------------------- | --------------------- | --------- | ------------------------------ | --------------------------- |
| **enable_cors**                  | cors toggle           | Boolean   | true                           | ENABLE_CORS                 |
| **env**                          | node env              | String    | development                    | NODE_ENV                    |
| **environment**                  | env                   | String    | fynd                           | ENV                         |
| **sentry.dsn**                   | sentry url            | String    | <sentry_url>                   | SENTRY_DSN                  |
| **sentry.environment**           | sentry environment    | String    | development                    | SENTRY_ENVIRONMENT          |
| **newrelic.app_name**            | new relic app name    | String    | mock                           | NEW_RELIC_APP_NAME          |
| **newrelic.license_key**         | new relic license key | String    | <newrelic_license_key>         | NEW_RELIC_LICENSE_KEY       |
| **port**                         | The port to bind      | port      | 5050                           | PORT                        |
| **log_level**                    | log level for logger  | String    | info                           | LOG_LEVEL                   |
| **mode**                         | app mode              | String    | server                         | MODE                        |
| **API_KEY**                      | Partners API Key      | String    | <api_key>                      | API_KEY                     |
| **API_SECRET**                   | Partners API Secret   | String    | <api_secret>                   | API_SECRET                  |

```javascript
api_key: {
    doc: 'extension api key',
    default: 'Your API Key',
    env: 'EXTENSION_API_KEY',
},
api_secret: {
    doc: 'extension api secret',
    default: 'Your API Secret',
    env: 'EXTENSION_API_SECRET',
},
```

6. **🔒 Secure Tunnel Setup.**

   Install ngrok or a similar cross-platform application to create secure tunnels, enabling your locally hosted web server to be accessible over the internet.

<p align="center">
  <a target="_blank" href="https://ngrok.com/download">
    <img src="https://cdn.pixelbin.io/v2/broken-limit-7ed062/original/ngrok-logo.png" alt="Ngrok" />
  </a>
</p>

7. 🚀 Launch ngrok to forward the port used by your local server.

    ```bash
    ngrok http 3000
    ```

    Replace `3000` with the actual port number your server is using. This will generate a public URL that securely tunnels to your local server.

8. 🌐 Update default env value for `EXTENSION_BASE_URL` with this URL.

```javascript
base_url: {
    doc: 'Host Main URL',
    format: String,
    default: 'https://your-ngrok-url',
    env: 'MOCK_MAIN_DOMAIN',
    arg: 'mock_main_domain',
},
```

9. 🛠️ Navigate to your extension in the Partner Panel and update the Extension URL field with the generated ngrok URL.

10. **💻 Run local server.**

    ```bash
    npm start
    ```

11. 🎉 You are ready to go.

### 🧪 Running Test Cases

After you have completed the local setup, you can run the test cases to ensure everything is working as expected. Follow these steps to execute the tests:

1. **📁 Navigate to the Project Directory.**

   If you're not already there, switch to your project's root directory in your terminal.

   ```bash
   cd path/to/your/project
   ```

2. **🧪 Run Backend Tests.**

   Execute the backend test cases using the following command:

   ```bash
   npm test
   ```

### 📋 Fynd Platform Panel

  <p align="center">
    <a target="_blank" href="https://platform.fynd.com/">
      <img src="https://cdn.pixelbin.io/v2/broken-limit-7ed062/original/Fynd-platform.webp" alt="Fynd Platform" width="400" />
    </a>
  </p>

1. 📝 Register on our [Platform panel](https://platform.fynd.com/).
2. 👥 After registration, either join an existing Platform Organization or create a new one.
3. 🏢 Upon registration completion, find your organization's ID in the URL, such as `https://platform.fynd.com/company/:company-id/home/`.
4. 🔒 For a private extension, navigate to Extension > Private Extension. Private extensions are recommended for development purposes.
5. 🌐 For a public extension, navigate to Extension > Extension Marketplace.
6. 🔍 Locate your extension in the list and click the `Install` button.
7. 👥 For private extensions, add the company ID as a subscriber for the extension in the Partner's Panel. Navigate to your extension in the Partner's Panel, click on the `Add Subscribers` button, enter your `company-id` in the `Subscriber Id` field, and click `Add Subscriber`.
8. 🎉 After installation, your extension will be listed under your organization's extensions.
9. 🔍 Click on your extension to open it.
10. 🔄 Your changes from local development will be reflected here.

### 💎 Code Quality Checks

This project enforces code quality and consistency using ESLint and Prettier. Please ensure you've addressed any linting errors and test failures before pushing your commits.

---

### How It Works

Merchants can easily install and activate the payment extension on their Fynd Platform. During checkout, customers will be presented with the payment options provided by the extension. Currently, the Fynd Platform supports standard checkout, where customers are redirected to the payment gateway's hosted page to complete their transactions.
# boxpay-checkout-fynd-payment-extension
