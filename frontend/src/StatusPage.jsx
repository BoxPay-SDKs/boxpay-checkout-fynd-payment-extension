import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import './App.css';

function StatusPage() {
  const { company_id: companyId } = useParams();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const appId = searchParams.get('application_id');
  const gid = searchParams.get('gid');

  // Function to call extension webhook directly
  const callExtensionWebhook = async (status) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${window.location.origin}/api/v1/payment_callback/${companyId}/${appId}?gid=${gid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status,
          timestamp: new Date().toISOString(),
          transaction_id: `txn_${Date.now()}`,
          amount: 100.00,
          currency: 'INR',
          payment_details: [{
            payment_id: `txn_${Date.now()}`,
            mode: 'live',
            aggregator_order_id: `txn_${Date.now()}`,
            amount: 10000,
            currency: 'INR',
            status: status === 'PAYMENT_COMPLETE' ? 'complete' : 'failed',
            created: new Date().toISOString()
          }],
        }),
      });
      const data = await response.json();
      if (data.action === 'redirect' && data.redirectUrl) {
        // Add a small delay to show the loader
        setTimeout(() => {
          window.location.href = decodeURIComponent(data.redirectUrl);
        }, 1000);
      }
      return data;
    } catch (error) {
      console.error('Error calling extension webhook:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const handleSuccess = async () => {
    try {
      const webhookResponse = await callExtensionWebhook('PAYMENT_COMPLETE');
      console.log('Extension Webhook Response:', webhookResponse);
      console.log('Payment status updated to success');
    } catch (error) {
      console.error('Error in payment process:', error);
    }
  };

  const handleFailure = async () => {
    try {
      const webhookResponse = await callExtensionWebhook('PAYMENT_FAILED');
      console.log('Extension Webhook Response:', webhookResponse);
      console.log('Payment status updated to failure');
    } catch (error) {
      console.error('Error in payment process:', error);
    }
  };

  return (
    <div className="form-container">
      <h1>Payment Status</h1>
      
      <div className="note-box">
        <p>
          <strong>Payment Status Page</strong> Click the buttons below to simulate different payment states.
        </p>
      </div>
      
      {isLoading && (
        <div className="loader-container">
          <div className="loader"></div>
          <p>Processing payment...</p>
        </div>
      )}
      
      <div className="form-actions">
        <button 
          onClick={handleSuccess}
          className="submit-button"
          style={{ marginRight: '10px' }}
          disabled={isLoading}
        >
          Success
        </button>
        <button 
          onClick={handleFailure}
          className="submit-button"
          style={{ backgroundColor: '#dc3545' }}
          disabled={isLoading}
        >
          Failure
        </button>
      </div>
    </div>
  );
}

export default StatusPage; 