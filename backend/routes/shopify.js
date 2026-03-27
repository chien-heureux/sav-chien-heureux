const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

const SHOPIFY_BASE = `https://${process.env.SHOPIFY_STORE}.myshopify.com/admin/api/2024-01`;
const HEADERS = {
  'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN,
  'Content-Type': 'application/json'
};

// GET /api/shopify/orders — liste des commandes récentes
router.get('/orders', async (req, res) => {
  try {
    const { status = 'any', limit = 50 } = req.query;
    const url = `${SHOPIFY_BASE}/orders.json?status=${status}&limit=${limit}&fields=id,name,email,created_at,fulfillment_status,financial_status,total_price,line_items,shipping_address,fulfillments`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data.orders || []);
  } catch (err) {
    console.error('Shopify orders error:', err);
    res.status(500).json({ error: 'Erreur Shopify commandes' });
  }
});

// GET /api/shopify/orders/:id — détail d'une commande
router.get('/orders/:id', async (req, res) => {
  try {
    const url = `${SHOPIFY_BASE}/orders/${req.params.id}.json`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data.order || {});
  } catch (err) {
    console.error('Shopify order detail error:', err);
    res.status(500).json({ error: 'Erreur Shopify commande' });
  }
});

// GET /api/shopify/customers/search?email=xxx — chercher un client par email
router.get('/customers/search', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email requis' });
    const url = `${SHOPIFY_BASE}/customers/search.json?query=email:${encodeURIComponent(email)}&fields=id,first_name,last_name,email,orders_count,total_spent,created_at`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data.customers || []);
  } catch (err) {
    console.error('Shopify customer search error:', err);
    res.status(500).json({ error: 'Erreur recherche client' });
  }
});

// GET /api/shopify/customers/:id/orders — commandes d'un client
router.get('/customers/:id/orders', async (req, res) => {
  try {
    const url = `${SHOPIFY_BASE}/orders.json?customer_id=${req.params.id}&status=any&fields=id,name,created_at,fulfillment_status,total_price,fulfillments`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();
    res.json(data.orders || []);
  } catch (err) {
    console.error('Shopify customer orders error:', err);
    res.status(500).json({ error: 'Erreur commandes client' });
  }
});

// GET /api/shopify/alerts — commandes avec problèmes de livraison
router.get('/alerts', async (req, res) => {
  try {
    const url = `${SHOPIFY_BASE}/orders.json?status=open&fulfillment_status=partial,unfulfilled&limit=50&fields=id,name,email,created_at,fulfillment_status,fulfillments,shipping_address`;
    const response = await fetch(url, { headers: HEADERS });
    const data = await response.json();

    const now = new Date();
    const alerts = (data.orders || []).filter(order => {
      const created = new Date(order.created_at);
      const daysSince = (now - created) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    });

    res.json(alerts);
  } catch (err) {
    console.error('Shopify alerts error:', err);
    res.status(500).json({ error: 'Erreur alertes' });
  }
});

module.exports = router;
