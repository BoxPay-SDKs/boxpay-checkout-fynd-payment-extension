import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import StatusPage from './StatusPage';

const router = createBrowserRouter([
  {
    path: '/company/:company_id/credentials',
    element: <App />,
  },
  {
    path: '/company/:company_id/status',
    element: <StatusPage />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
