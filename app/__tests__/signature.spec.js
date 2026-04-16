const {
  verifyPlatformChecksum,
  verifyExtensionAuth,
  verifyStatusChecksum,
} = require('../middleware/checksum.middleware');
const { AuthorizationError } = require('../utils/error.util');

jest.mock('../config', () => ({
  api_secret: 'secret',
}));

describe('platform checksum verification', () => {
  let req;
  beforeEach(() => {
    req = {
      body: {
        key: 'test value',
      },
      headers: {
        checksum:
          'b800807ed2c815a9d559a8e2f991f7716b55d5353f8a07dcf873c194c2d5d32c',
      },
    };
  });

  test('should pass', () => {
    verifyPlatformChecksum(req, null, () => {});
  });

  test('should fail', () => {
    req.headers.checksum = 'incorrect_checksum'; // wrong checksum
    expect(() => {
      verifyPlatformChecksum(req, null, () => {});
    }).toThrow(AuthorizationError);
  });
});

describe('extension auth', () => {
  let req;
  beforeEach(() => {
    req = {
      headers: {
        authorization: 'Basic c2VjcmV0',
      },
    };
  });

  test('should pass', () => {
    verifyExtensionAuth(req, null, () => {});
  });

  test('should fail', () => {
    req.headers.authorization = 'incorrect_auth'; // wrong checksum
    expect(() => {
      verifyExtensionAuth(req, null, () => {});
    }).toThrow(AuthorizationError);
  });
});

describe('status checksum verification', () => {
  let req;
  beforeEach(() => {
    req = {
      params: {
        gid: 'TR893498924759553',
      },
      headers: {
        checksum:
          '9d0eea741c16280078c2881eb65de1c87c06be87915dd79e1027d0d4f36b0b15',
      },
    };
  });

  test('should pass', () => {
    verifyStatusChecksum(req, null, () => {});
  });

  test('should fail', () => {
    req.headers.checksum = 'incorrect_checksum'; // wrong checksum
    expect(() => {
      verifyStatusChecksum(req, null, () => {});
    }).toThrow(AuthorizationError);
  });
});

describe('application id verification', () => {
  let req;
  beforeEach(() => {
    req = {
      params: {
        app_id: '000000000000000000000001',
      },
      headers: {
        'x-application-id': '000000000000000000000001',
      },
    };
  });

});
