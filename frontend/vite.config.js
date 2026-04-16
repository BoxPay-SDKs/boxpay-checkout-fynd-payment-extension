import { defineConfig } from "vite";
import { dirname } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

// Environment variables
const BACKEND_PORT = process.env.BACKEND_PORT;
const HOST = process.env.HOST;
const EXTENSION_BASE_URL = process.env.EXTENSION_BASE_URL;
const FRONTEND_PORT = process.env.FRONTEND_PORT;

const proxyOptions = {
  target: `http://127.0.0.1:${BACKEND_PORT}`,
  changeOrigin: false,
  secure: true,
  ws: false,
};

const host = HOST
  ? HOST.replace(/https?:\/\//, "")
  : "localhost";

let allowedHost = '';

try {
  allowedHost = new URL(EXTENSION_BASE_URL).hostname;
} catch (e) {
  console.warn('Invalid EXTENSION_BASE_URL provided:', EXTENSION_BASE_URL);
}

let hmrConfig;
if (host === "localhost") {
  hmrConfig = {
    protocol: "ws",
    host: "localhost",
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: "wss",
    host: host,
    port: FRONTEND_PORT,
    clientPort: 443,
  };
}

export default defineConfig({
  root: dirname(fileURLToPath(import.meta.url)),
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
  },
  build: {
    outDir: 'public/dist'
  },
  server: {
    host: "localhost",
    port: FRONTEND_PORT,
    allowedHosts: allowedHost ? [allowedHost] : [],
    proxy: {
      '^/(\\?.*)?$': proxyOptions,
      '^/api(/|(\\?.*)?$)': proxyOptions,
      '^/fp(/|(\\?.*)?$)': proxyOptions,
      '^/adm(/|(\\?.*)?$)': proxyOptions,
      '^/protected(/|(\\?.*)?$)': proxyOptions,
      '^/v1(/|(\\?.*)?$)': proxyOptions,
      '^/payment(/|(\\?.*)?$)': proxyOptions,
      '^/creds(/|(\\?.*)?$)': proxyOptions
    },
  },
});