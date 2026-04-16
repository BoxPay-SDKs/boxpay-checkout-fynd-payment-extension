const EncryptHelper = require('../utils/encrypt.util');

const originalMsg = {
  key: 'This is a test value',
};
const encryptionKey =
  '07385a56ad050fec6f145cd30cf32b345cf2d7e4006d8c5fb1dd7463a0834c47';

describe('encrypt decrypt', () => {
  test('first encrypt then decrypt', () => {
    const encryptedMessage = EncryptHelper.encrypt(
      encryptionKey,
      JSON.stringify(originalMsg)
    );
    const decryptedMessage = EncryptHelper.decrypt(
      encryptionKey,
      encryptedMessage
    );
    const jsonMessage = JSON.parse(decryptedMessage);
    expect(jsonMessage).toEqual(originalMsg);
  });
});
