const CryptoJS = require('crypto-js');

class EncryptHelper {
  static encrypt(secretKey, msg) {
    return CryptoJS.AES.encrypt(msg, secretKey).toString();
  }

  static decrypt(secretKey, encryptedMessage) {
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}

module.exports = EncryptHelper;
