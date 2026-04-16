import React, { useState, useEffect } from 'react';
import { FaRegEye, FaRegEyeSlash, FaInfoCircle } from 'react-icons/fa';
import { useParams, useSearchParams } from 'react-router-dom';
import './App.css';

// API endpoints
const getCredentialsUrl = (appId, companyId) =>
  `${window.location.origin}/protected/v1/company/${companyId}/credentials/${appId}`;

const CREDENTIAL_FIELDS = [
  {
    slug: 'api_key',
    name: 'API Key',
    required: true,
    display: true,
    placeholder: 'Enter your BoxPay API Key',
    description: 'Your secret API key from the BoxPay dashboard',
  },
  {
    slug: 'legal_entity',
    name: 'Legal Entity',
    required: true,
    display: true,
    placeholder: 'e.g. boxpay-india',
    description: 'Legal entity identifier provided by BoxPay',
  },
  {
    slug: 'merchant_id',
    name: 'Merchant ID',
    required: true,
    display: true,
    placeholder: 'Enter your BoxPay Merchant ID',
    description: 'Your unique merchant identifier from the BoxPay dashboard',
  },
];

// Main App Component
function App() {
  const [searchParams] = useSearchParams();
  const { company_id: companyId } = useParams();
  const [formData, setFormData] = useState({});
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [params, setParams] = useState([]);
  const [error, setError] = useState(null);

  const getApplication = () => {
    const appId = searchParams.get('application_id');
    if (!appId) {
      console.error('Application ID is missing from URL');
      return null;
    }
    return appId;
  };

  const getCompanyId = () => {
    if (!companyId) {
      console.error('Company ID is missing from URL');
      return null;
    }
    return companyId;
  };

  const getCommonHeaders = () => {
    const appId = getApplication();
    const companyId = getCompanyId();
    return {
      'x-application-id': appId,
      'x-company-id': companyId,
      'content-type': 'application/json'
    };
  };

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        const appId = getApplication();
        const companyId = getCompanyId();

        if (!appId || !companyId) {
          setError('Application ID or Company ID is missing from URL');
          setIsLoading(false);
          return;
        }

        const url = getCredentialsUrl(appId, companyId);
        console.log('Fetching credentials from:', url);

        const response = await fetch(url, {
          headers: getCommonHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Received data:', data);

        // Merge backend saved values into the BoxPay credential params
        const savedData = data?.data || [];
        const mergedParams = CREDENTIAL_FIELDS.map((param) => {
          const savedParam = savedData.find((s) => s.slug === param.slug);
          return {
            ...param,
            value: savedParam?.value || ''
          };
        });

        setParams(mergedParams);
        setFormData(
          mergedParams.reduce((acc, param) => ({
            ...acc,
            [param.slug]: param.value || ''
          }), {})
        );
      } catch (error) {
        console.error('Error fetching credentials:', error);

        // Fallback — still show the form with empty fields
        setParams(CREDENTIAL_FIELDS);
        setFormData(
          CREDENTIAL_FIELDS.reduce((acc, param) => ({
            ...acc,
            [param.slug]: ''
          }), {})
        );
        setError(null); // Don't block the form from showing
      } finally {
        setIsLoading(false);
      }
    };

    fetchCredentials();
  }, []);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validate all required fields
    const missingFields = params
      .filter((p) => p.required && !formData[p.slug]?.trim())
      .map((p) => p.name);

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const appId = getApplication();
      const companyId = getCompanyId();

      if (!appId || !companyId) {
        throw new Error('Application ID or Company ID is missing from URL');
      }

      const body = Object.entries(formData).map(([slug, value]) => ({
        slug,
        value
      }));

      const response = await fetch(getCredentialsUrl(appId, companyId), {
        method: 'POST',
        headers: getCommonHeaders(),
        body: JSON.stringify({ data: body }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success === true) {
        setShowSuccessBanner(true);
        setTimeout(() => setShowSuccessBanner(false), 3000);
      } else {
        throw new Error(data.message || 'Failed to save credentials');
      }
    } catch (error) {
      console.error('Error submitting credentials:', error);
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePasswordVisibility = (fieldId) => {
    setIsPasswordVisible(prev => ({
      ...prev,
      [fieldId]: !prev[fieldId]
    }));
  };

  const renderCredentialsSection = () => (
    <div className="section">
      <h2>API Credentials</h2>
      <p className="section-description">
        Configure your BoxPay API credentials below. These credentials are essential for
        authenticating and processing payments through BoxPay. Make sure to use the correct
        credentials provided by the BoxPay team.
      </p>
      {params.map((param) => (
        param.display !== false && (
          <div key={param.slug} className="form-field">
            <label htmlFor={param.slug}>
              {param.name}
              {param.required && <span className="required">*</span>}
              {param.description && (
                <span className="field-tooltip">
                  <FaInfoCircle />
                  <span className="tooltip-text">{param.description}</span>
                </span>
              )}
            </label>
            <div className="input-group">
              <input
                id={param.slug}
                required={param.required}
                name={param.slug}
                value={formData[param.slug] || ''}
                type={isPasswordVisible[param.slug] ? 'text' : 'password'}
                onChange={handleInputChange}
                disabled={isSubmitting}
                placeholder={param.placeholder || ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => togglePasswordVisibility(param.slug)}
                disabled={isSubmitting}
              >
                {isPasswordVisible[param.slug]
                  ? <FaRegEye size={20} />
                  : <FaRegEyeSlash size={20} />}
              </button>
            </div>
          </div>
        )
      ))}
    </div>
  );

  if (isLoading) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="form-container">
      <h1>Payment Gateway Configuration</h1>

      <div className="note-box">
        <p>
          <strong>Welcome to BoxPay Setup!</strong> Enter your BoxPay API credentials below.
          These are required to authenticate and process payments through BoxPay Checkout.
          Contact the BoxPay team if you need help finding your credentials.
        </p>
      </div>

      {error && (
        <div className="message-box error">
          <span>⚠ {error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {renderCredentialsSection()}

        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {showSuccessBanner && (
        <div className="message-box success">
          <span className="success-icon">✓</span>
          <span>Configuration saved successfully</span>
        </div>
      )}
    </div>
  );
}

export default App;