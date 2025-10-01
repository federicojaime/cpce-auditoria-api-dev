const express = require('express');
const router = express.Router();

// Proxy para cargar contenido del vademécum
router.post('/proxy', async (req, res) => {
  try {
    const { url, token } = req.body;
    
    const response = await fetch(`${url}?token=${token}`, {
      headers: {
        'User-Agent': 'CPCE-Sistema',
        'Cookie': req.headers.cookie || ''
      }
    });
    
    const html = await response.text();
    res.send(html);
  } catch (error) {
    res.status(500).json({ error: 'Proxy error' });
  }
});

module.exports = router;