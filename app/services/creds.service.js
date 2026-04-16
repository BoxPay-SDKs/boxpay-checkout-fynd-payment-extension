const express = require('express');

class CredsService {
  constructor(handlers = {}) {
    if (!handlers.checkPaymentReadiness) {
      throw new Error('Required handlers missing for CredsService');
    }
    
    this.checkPaymentReadiness = handlers.checkPaymentReadiness;
  }

  registerRoutes(app) {
    const router = express.Router();

    // Register credential routes
    router.get('/secrets/:app_id', this.checkPaymentReadiness);

    // Mount the router
    app.use('/api/v1', router);
  }
}

module.exports = { CredsService }; 