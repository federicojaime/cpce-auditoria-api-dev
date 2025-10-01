import express from 'express';

const router = express.Router();

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

export default router;