// api/send-email.js
// Secure backend email sending using EmailJS REST API

const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { to_email, from_name, message } = req.body;

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
      const error = await response.text();
      res.status(500).json({ error: 'EmailJS error', details: error });
      return;
    }

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
};
