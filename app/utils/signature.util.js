const crypto = require('node:crypto');

function getHmacChecksum(message, secret) {
  const encodedBytes = Buffer.from(message, 'utf-8');
  const hmac = crypto.createHmac('sha256', secret).update(encodedBytes);
  return hmac.digest('hex').toString();
}

module.exports = {
  getHmacChecksum,
};
