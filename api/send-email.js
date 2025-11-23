// api/send-email.js
// Secure backend email sending using EmailJS REST API

const fetch = require('node-fetch');

// For Vercel compatibility, also support export default
module.exports = async (req, res) => {
  // Log method and headers
  console.log('Request method:', req.method);
  console.log('Request headers:', req.headers);

  // Log environment variables (do not log secrets)
  console.log('EMAILJS_SERVICE_ID:', process.env.EMAILJS_SERVICE_ID);
  console.log('EMAILJS_TEMPLATE_ID:', process.env.EMAILJS_TEMPLATE_ID);
  console.log('EMAILJS_PRIVATE_KEY exists:', !!process.env.EMAILJS_PRIVATE_KEY);

  // Log raw body if present
  if (req.body) {
    console.log('Request body (raw):', req.body);
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Parse JSON body if not already parsed (Vercel/Node.js)

  let body = req.body;
  if (!body || typeof body !== 'object') {
    try {
      body = JSON.parse(req.body);
    } catch (e) {
      // If parsing fails, try reading from req (Vercel edge)
      let raw = '';
      req.on('data', chunk => { raw += chunk; });
      await new Promise(resolve => req.on('end', resolve));
      try {
        body = JSON.parse(raw);
      } catch (err) {
        console.error('Invalid JSON body:', err);
        res.status(400).json({ error: 'Invalid JSON body' });
        return;
      }
    }
  }

  console.log('Parsed body:', body);

  const { to_email, from_name, message } = body || {};

  // Validate input
  if (!to_email || !from_name || !message) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // Use your private EmailJS REST API key (never expose to frontend)
  const EMAILJS_PRIVATE_KEY = process.env.EMAILJS_PRIVATE_KEY;
  const EMAILJS_SERVICE_ID = process.env.EMAILJS_SERVICE_ID;
  const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID;

  if (!EMAILJS_PRIVATE_KEY || !EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID) {
    res.status(500).json({ error: 'EmailJS server config missing' });
    return;
  }

  // Prepare EmailJS REST API payload
  const payload = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID,
    user_id: EMAILJS_PRIVATE_KEY, // This is the private API key
    template_params: {
      to_email,
      from_name,
      message
    }
  };

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {}
      res.status(500).json({ error: 'EmailJS error', details: errorText });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
