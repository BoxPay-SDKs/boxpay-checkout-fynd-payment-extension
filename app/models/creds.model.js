const { fdkExtension } = require('../fdk');

const CredsModel = {
  // Store encrypted credentials
  storeCreds: async (appId,companyId, encryptedSecret) => {
    try {
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${appId}`;
      await fdkExtension.extension.storage.set(key, encryptedSecret);
      return true;
    } catch (error) {
      console.error('Error storing credentials:', error);
      throw error;
    }
  },

  // Get encrypted credentials
  getCreds: async (appId) => {
    try {
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${appId}`;
      const credsData = await fdkExtension.extension.storage.get(key);
      return credsData;
    } catch (error) {
      console.error('Error getting credentials:', error);
      throw error;
    }
  },

  // Check if credentials exist
  checkCredsExist: async (appId) => {
    try {
      if (!fdkExtension) {
        throw new Error('FDK extension is not initialized');
      }
      
      if (!fdkExtension.extension.storage) {
        throw new Error('FDK storage is not initialized');
      }

      const key = `creds:${appId}`;
      const credsData = await fdkExtension.extension.storage.get(key);
      
      return !!credsData;
    } catch (error) {
      console.error('Error checking credentials:', error);
      throw error;
    }
  }
};

module.exports = CredsModel; 