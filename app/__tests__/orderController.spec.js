const { 
  initiatePaymentToPGHandler,
  createRefundHandler,
  getPaymentDetailsHandler,
  getRefundDetailsHandler,
  paymentCallbackHandler,
  processPaymentWebhookHandler,
  processRefundWebhookHandler
} = require('../controllers/transaction.controller');

describe('Order Controller', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {}
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      render: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();
  });

  describe('initiatePaymentToPGHandler', () => {
    test('should create order successfully with valid data', async () => {
      mockRequest.body = {
        amount: 1000,
        currency: 'USD',
        payment_method: 'card',
        customer_details: { name: 'Test User' }
      };

      await initiatePaymentToPGHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            amount: 1000,
            currency: 'USD',
            payment_method: 'card',
            status: 'pending'
          })
        })
      );
    });

    test('should handle missing required fields', async () => {
      mockRequest.body = {
        amount: 1000
        // Missing currency and payment_method
      };

      await initiatePaymentToPGHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('createRefundHandler', () => {
    test('should create refund successfully with valid data', async () => {
      mockRequest.body = {
        order_id: 'order_123',
        amount: 500,
        reason: 'Customer request'
      };

      await createRefundHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            order_id: 'order_123',
            amount: 500,
            status: 'pending'
          })
        })
      );
    });

    test('should handle missing required fields', async () => {
      mockRequest.body = {
        order_id: 'order_123'
        // Missing amount
      };

      await createRefundHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getPaymentDetailsHandler', () => {
    test('should get payment details successfully', async () => {
      mockRequest.params = {
        gid: 'test_payment_123'
      };

      await getPaymentDetailsHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'test_payment_123',
            status: 'completed'
          })
        })
      );
    });

    test('should handle missing payment session ID', async () => {
      mockRequest.params = {};

      await getPaymentDetailsHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getRefundDetailsHandler', () => {
    test('should get refund details successfully', async () => {
      mockRequest.params = {
        gid: 'test_refund_123'
      };

      await getRefundDetailsHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'test_refund_123',
            status: 'completed'
          })
        })
      );
    });

    test('should handle missing refund session ID', async () => {
      mockRequest.params = {};

      await getRefundDetailsHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('paymentCallbackHandler', () => {
    test('should process payment callback successfully', async () => {
      mockRequest.params = {
        company_id: '123',
        app_id: '456'
      };
      mockRequest.body = {
        status: 'success',
        transaction_id: 'txn_123'
      };

      await paymentCallbackHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(308);
      expect(mockResponse.render).toHaveBeenCalledWith(
        'redirector',
        expect.objectContaining({
          success: true,
          redirect_url: '/payment/success'
        })
      );
    });
  });

  describe('processPaymentWebhookHandler', () => {
    test('should process webhook successfully', async () => {
      mockRequest.body = {
        data: { status: 'success' },
        headers: { signature: 'valid_signature' }
      };

      await processPaymentWebhookHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Webhook processed successfully'
        })
      );
    });

    test('should handle invalid webhook payload', async () => {
      mockRequest.body = {};

      await processPaymentWebhookHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('processRefundWebhookHandler', () => {
    test('should process refund webhook successfully', async () => {
      mockRequest.body = {
        data: { status: 'refund_success' },
        headers: { signature: 'valid_signature' }
      };

      await processRefundWebhookHandler(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Refund webhook processed successfully'
        })
      );
    });

    test('should handle invalid refund webhook payload', async () => {
      mockRequest.body = {};

      await processRefundWebhookHandler(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
}); 