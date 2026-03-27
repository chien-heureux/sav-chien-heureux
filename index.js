require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/shopify', require('./routes/shopify'));
app.use('/api/mail', require('./routes/mail'));
app.use('/api/tickets', require('./routes/tickets'));

// Health check
app.get('/api/ping', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SAV Backend démarré sur le port ${PORT}`);
});
