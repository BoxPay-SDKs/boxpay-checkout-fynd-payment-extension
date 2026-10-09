/**
 * EncryptHelper — AES-256-GCM authenticated encryption using Node native crypto.
 *
 * Format of stored ciphertext (colon-delimited, base64 parts):
 *   <iv_b64>:<authTag_b64>:<ciphertext_b64>
 *
 * GCM provides both confidentiality AND integrity — a tampered ciphertext will
 * throw on decrypt rather than silently returning garbage (unlike CBC).
 *
 * Key derivation: PBKDF2-SHA256 with a fixed salt derived from the key itself,
 * 100k iterations → 32-byte AES key. This ensures the raw EXTENSION_API_SECRET
 * string (any length) is safely stretched to exactly 256 bits.
 */
const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const IV_LEN     = 12;   // 96-bit IV — recommended for GCM
const TAG_LEN    = 16;   // 128-bit auth tag
const KEY_LEN    = 32;   // 256-bit AES key
const ITERATIONS = 100_000;
const DIGEST     = 'sha256';

/**
 * Derive a 32-byte AES key from the secret string using PBKDF2.
 * Salt is deterministic (SHA-256 of the secret) so no extra storage needed.
 */
function deriveKey(secret) {
  const salt = crypto.createHash('sha256').update(secret).digest();
  return crypto.pbkdf2Sync(secret, salt, ITERATIONS, KEY_LEN, DIGEST);
}

class EncryptHelper {
  /**
   * Encrypt a plaintext string.
   * Returns a colon-delimited base64 string: iv:authTag:ciphertext
   */
  static encrypt(secretKey, msg) {
    const key = deriveKey(secretKey);
    const iv  = crypto.randomBytes(IV_LEN);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const ciphertext = Buffer.concat([
      cipher.update(msg, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      authTag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  /**
   * Decrypt a value produced by encrypt().
   * Throws if the ciphertext has been tampered with (GCM auth tag mismatch).
   *
   * Also handles legacy CBC values produced by the old crypto-js implementation
   * (they don't contain colons) so existing stored credentials keep working.
   */
  static decrypt(secretKey, encryptedMessage) {
    // Legacy CBC format detection — no colons means old crypto-js format
    if (!encryptedMessage.includes(':')) {
      // Fall back to crypto-js for backward compatibility with stored credentials
      const CryptoJS = require('crypto-js');
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    }

    const [ivB64, authTagB64, ciphertextB64] = encryptedMessage.split(':');
    const key        = deriveKey(secretKey);
    const iv         = Buffer.from(ivB64, 'base64');
    const authTag    = Buffer.from(authTagB64, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),        // throws ERR_CRYPTO_GCM_AUTH_TAG_MISMATCH if tampered
    ]).toString('utf8');
  }
}

module.exports = EncryptHelper;
