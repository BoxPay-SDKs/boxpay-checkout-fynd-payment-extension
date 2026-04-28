import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import StatusPage from './StatusPage';

const BASE_PATH = import.meta.env.VITE_BASE_PATH || '';

const router = createBrowserRouter([
  {
    path: `${BASE_PATH}/company/:company_id/credentials`,
    element: <App />,
  },
  {
    path: `${BASE_PATH}/company/:company_id/status`,
    element: <StatusPage />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
