require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/webhooks', require('./routes/webhooks'));
app.use('/api', require('./routes/api'));
app.use('/', require('./routes/ui'));

// Health check
app.get('/health', require('./routes/health'));

// Start
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('   CRM MOVILUBE CON IA - INICIADO');
  console.log('========================================');
  console.log(`   URL local: http://localhost:${PORT}`);
  console.log(`   Empresa:   ${process.env.COMPANY_NAME || 'Movilube'}`);
  console.log('========================================');
  console.log('');
});

module.exports = app;
