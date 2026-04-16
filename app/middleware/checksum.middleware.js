const { AuthorizationError } = require('../utils/error.util');
const { getHmacChecksum } = require('../utils/signature.util');

// Environment variables
const EXTENSION_API_SECRET = process.env.EXTENSION_API_SECRET;

const verifyPlatformChecksum = (req, res, next) => {
  const requestPayload = req.body;

  const checksum = getHmacChecksum(
    JSON.stringify(requestPayload),
    EXTENSION_API_SECRET
  );

  if (checksum !== req.headers.checksum)
    throw new AuthorizationError('Invalid Checksum');
  next();
};

const verifyExtensionAuth = (req, res, next) => {
  const basicAuthHeader = `Basic ${btoa(EXTENSION_API_SECRET)}`;

  if (basicAuthHeader !== req.headers.authorization)
    throw new AuthorizationError('Authorization failed');
  next();
};

const verifyStatusChecksum = (req, res, next) => {
  const { gid } = req.params;

  const checksum = getHmacChecksum(gid, EXTENSION_API_SECRET);

  if (checksum !== req.headers.checksum)
    throw new AuthorizationError('Invalid Checksum');
  next();
};

module.exports = {
  verifyPlatformChecksum,
  verifyExtensionAuth,
  verifyStatusChecksum
};
