// Example frontend code to call the secure backend email API
// Place this in your JS where you handle the email form submission

async function sendEmail({ to_email, from_name, message }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to_email, from_name, message })
    });

    const contentType = response.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      alert('Server error: ' + text);
      return false;
    }

    if (response.ok) {
      alert('Email sent successfully!');
      return true;
    } else {
      alert('Failed to send email: ' + (data.error || 'Unknown error'));
      return false;
    }
  } catch (err) {
    alert('Error sending email: ' + err.message);
    return false;
  }
}

// Usage example:
// sendEmail({
//   to_email: 'recipient@example.com',
//   from_name: 'Your Name',
//   message: 'Hello from Cinematic Hub!'
// });
