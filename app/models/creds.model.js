const CredsModel = {
  // Store encrypted credentials
  storeCreds: async (appId,companyId, encryptedSecret) => {
    try {
      const { fdkExtension } = require('../fdk');
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${companyId}:${appId}`;
      await fdkExtension.extension.storage.set(key, encryptedSecret);
      return true;
    } catch (error) {
      throw error;
    }
  },

  // Get encrypted credentials
  getCreds: async (appId, companyId) => {
    try {
      const { fdkExtension } = require('../fdk');
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${companyId}:${appId}`;
      const credsData = await fdkExtension.extension.storage.get(key);
      return credsData;
    } catch (error) {
      throw error;
    }
  },

  // Check if credentials exist
  checkCredsExist: async (appId, companyId) => {
    try {
      const { fdkExtension } = require('../fdk');
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${companyId}:${appId}`;
      const credsData = await fdkExtension.extension.storage.get(key);
      
      return !!credsData;
    } catch (error) {
      throw error;
    }
  }
};

module.exports = CredsModel; 