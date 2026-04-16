require('dotenv').config();

// Environment variables
const BACKEND_PORT = process.env.BACKEND_PORT || 3000;

const app = require('./app/server');

app.listen(BACKEND_PORT, () => {
  console.log(`Example app listening at port:${BACKEND_PORT}`);
});
