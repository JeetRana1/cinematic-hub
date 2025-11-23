// api/send-email.js
// Secure backend email sending using EmailJS REST API


const sgMail = require('@sendgrid/mail');

// For Vercel compatibility, also support export default
module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
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


  // Validate input: all required fields for SendGrid
  const requiredFields = ['from_email', 'subject', 'message'];
  const missing = requiredFields.filter(f => !body[f]);
  if (missing.length > 0) {
    res.status(400).json({ error: 'Missing required fields', missing });
    return;
  }

  // Use SendGrid API
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const TO_EMAIL = process.env.SENDGRID_TO_EMAIL || 'your_verified_recipient@example.com';
  const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'your_verified_sender@example.com';

  if (!SENDGRID_API_KEY) {
    res.status(500).json({ error: 'SendGrid API key missing' });
    return;
  }

  sgMail.setApiKey(SENDGRID_API_KEY);

  const msg = {
    to: TO_EMAIL,
    from: FROM_EMAIL,
    replyTo: body.from_email,
    subject: body.subject,
    text: body.message,
    html: `<div><strong>Category:</strong> ${body.category || ''}</div>
           <div><strong>From:</strong> ${body.from_email}</div>
           <div><strong>Page:</strong> ${body.site_url || ''}</div>
           <div><strong>Message:</strong><br>${body.message.replace(/\n/g, '<br>')}</div>`
  };

  try {
    await sgMail.send(msg);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('SendGrid error:', err.response ? err.response.body : err.message);
    res.status(500).json({ error: 'SendGrid error', details: err.response ? err.response.body : err.message });
  }
};
