const {
  getSecretsHandler,
  createSecretsHandler,
} = require('../controllers/creds.controller');

const mockResponse = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
};

// Mock the Secret model with all required methods
jest.mock('../models/model', () => ({
  Secret: {
    create: jest.fn().mockResolvedValue({
      app_id: '000000000000000000000001',
      company_id: '1',
      secrets: 'encrypted_secret_data'
    }),
    findOne: jest.fn().mockResolvedValue({
      app_id: '000000000000000000000001',
      company_id: '1',
      secrets: '5f97e6a662f3198b8f6adf772b87020d:f6a18adea657f1b57ccfc0f1627be46c8333f167884a5320c6f636dfbe38a5e1'
    }),
    findOneAndUpdate: jest.fn().mockResolvedValue({
      app_id: '000000000000000000000001',
      company_id: '1',
      secrets: 'encrypted_secret_data'
    })
  }
}));

// Mock the encryption utility
jest.mock('../utils/encryptUtils', () => ({
  encrypt: jest.fn().mockReturnValue('encrypted_secret_data'),
  decrypt: jest.fn().mockReturnValue(JSON.stringify({
    api_key: 'pk_sbox_twdgcftzcawgg7awq5pa3pwmnaq'
  }))
}));

describe('credential apis test', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('getSecretsHandler', () => {
    test('should get credentials successfully', async () => {
      const mockRequest = {
        params: {
          app_id: '000000000000000000000001',
          company_id: '1'
        },
        path: '/api/v1/secrets'
      };

      await getSecretsHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          is_active: true,
          app_id: '000000000000000000000001',
          data: expect.any(Array)
        })
      );
    });

    test('should return default fields when no secrets found', async () => {
      // Mock findOne to return null (no secrets found)
      const { Secret } = require('../models/model');
      Secret.findOne.mockResolvedValueOnce(null);

      const mockRequest = {
        params: {
          app_id: '000000000000000000000001',
          company_id: '1'
        },
        path: '/api/v1/secrets'
      };

      await getSecretsHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          is_active: false,
          app_id: '000000000000000000000001',
          data: expect.any(Array)
        })
      );
    });
  });

  describe('createSecretsHandler', () => {
    test('should create credentials successfully', async () => {
      const mockRequest = {
        params: {
          app_id: '000000000000000000000001',
          company_id: '1'
        },
        body: {
          data: [
            {
              slug: 'api_key',
              name: 'Api Key',
              value: 'pk_sbox_twdgcftzcawgg7awq5pa3pwmnaq',
              required: true
            }
          ]
        }
      };

      await createSecretsHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          app_id: '000000000000000000000001',
          is_active: true,
          message: 'Secrets successfully updated'
        })
      );
    });

    test('should handle missing required parameters', async () => {
      const mockRequest = {
        params: {
          app_id: '000000000000000000000001'
          // Missing company_id
        },
        body: {
          data: [
            {
              slug: 'api_key',
              name: 'Api Key',
              value: 'pk_sbox_twdgcftzcawgg7awq5pa3pwmnaq',
              required: true
            }
          ]
        }
      };

      await createSecretsHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Missing app_id or company_id'
        })
      );
    });

    test('should handle invalid credentials data', async () => {
      const mockRequest = {
        params: {
          app_id: '000000000000000000000001',
          company_id: '1'
        },
        body: {
          data: [] // Empty array
        }
      };

      await createSecretsHandler(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid or empty credentials array'
        })
      );
    });
  });
});
