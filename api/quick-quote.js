// Vercel Serverless Function: /api/quick-quote.js
// Handles the simplified enquiry form on the Google Ads landing page (it-recycling-quote.html).
// Lead capture is decoupled from email/SMS notifications so a submission always succeeds
// even if RESEND_API_KEY / ClickSend credentials are not yet configured.

import { saveLead } from './db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const {
            name,
            company,
            email,
            phone,
            postcode,
            message
        } = req.body;

        if (!name || !email || !phone || !message) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Durable fallback record: always visible in Vercel function logs, even if no
        // storage backend or Resend key is configured yet.
        console.log('QUICK QUOTE ENQUIRY:', JSON.stringify({ name, company, email, phone, postcode, message, timestamp: new Date().toISOString() }));

        // Save the lead using the same shape as the main booking form so it renders
        // correctly in the admin dashboard. Fields not collected here are set to
        // defined empty values (never undefined) to avoid breaking the dashboard's
        // lead search filter, which calls .toLowerCase() on several of these fields.
        try {
            await saveLead({
                orgName: company || name,
                orgType: 'enquiry',
                contactName: name,
                contactEmail: email,
                contactPhone: phone,
                addressStreet: '',
                addressCity: '',
                addressPostcode: postcode || '',
                collectionDate: '',
                collectionTime: '',
                requireDBS: false,
                requireOnsite: false,
                inventory: `Quick Quote Enquiry\n\n${message}`
            });
        } catch (dbErr) {
            console.error('Database lead save error:', dbErr);
        }

        // Best-effort email notification via Resend. Missing configuration or a
        // failed send must never fail the visitor's submission.
        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey) {
            try {
                const notificationEmailsEnv = process.env.NOTIFICATION_EMAILS || 'graham.m.222@gmail.com,info@clearcycleit.co.uk';
                const toEmails = notificationEmailsEnv.split(',').map(e => e.trim()).filter(Boolean);

                const html = `
                <!DOCTYPE html>
                <html>
                <head><meta charset="utf-8"><title>New Quick Quote Enquiry</title></head>
                <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background: #f4f6f8; margin: 0; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; border: 1px solid #e1e8ed;">
                        <div style="background: #0b1a2d; padding: 24px 30px; border-bottom: 3px solid #61ce70;">
                            <h1 style="color: #fff; margin: 0; font-size: 22px;">Clearcycle IT &mdash; Quick Quote Enquiry</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="color: #64748b; font-size: 14px; margin-top: 0;">A new enquiry was submitted via the Google Ads landing page.</p>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr><td style="padding: 8px 0; width: 35%; font-weight: 600; color: #555;">Name</td><td style="padding: 8px 0;">${name}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Company</td><td style="padding: 8px 0;">${company || 'N/A'}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Email</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #61ce70;">${email}</a></td></tr>
                                <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Phone</td><td style="padding: 8px 0;">${phone}</td></tr>
                                <tr><td style="padding: 8px 0; font-weight: 600; color: #555;">Postcode</td><td style="padding: 8px 0;">${postcode || 'N/A'}</td></tr>
                            </table>
                            <div style="margin-top: 20px; padding: 15px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; white-space: pre-wrap; font-size: 14px;">${message}</div>
                        </div>
                    </div>
                </body>
                </html>`;

                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: 'Clearcycle IT Website <noreply@clearcycleit.co.uk>',
                        to: toEmails,
                        subject: `New Quick Quote Enquiry - ${name}${company ? ' (' + company + ')' : ''}`,
                        html
                    })
                });
            } catch (emailErr) {
                console.error('Resend email error (quick quote):', emailErr);
            }
        } else {
            console.warn('RESEND_API_KEY not configured - quick quote email notification skipped, lead saved via saveLead/log only.');
        }

        // Best-effort SMS notification via ClickSend, same optional pattern as the booking form.
        const clicksendUsername = process.env.CLICKSEND_USERNAME;
        const clicksendApiKey = process.env.CLICKSEND_API_KEY;
        const clicksendToNumber = process.env.CLICKSEND_TO_NUMBER;

        if (clicksendUsername && clicksendApiKey && clicksendToNumber) {
            try {
                const authString = Buffer.from(`${clicksendUsername}:${clicksendApiKey}`).toString('base64');
                const smsBody = `Clearcycle IT: New quick quote enquiry from ${name}${company ? ' (' + company + ')' : ''}. Phone: ${phone}.`;
                const rawNumbers = clicksendToNumber.split(',').map(n => n.trim()).filter(Boolean);
                const messages = rawNumbers.map(num => {
                    let formatted = num;
                    if (formatted.startsWith('0') && !formatted.startsWith('00')) {
                        formatted = '+44' + formatted.substring(1);
                    } else if (formatted.startsWith('7')) {
                        formatted = '+44' + formatted;
                    }
                    return { source: 'vercel-api', body: smsBody, to: formatted };
                });

                await fetch('https://rest.clicksend.com/v3/sms/send', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Basic ${authString}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ messages })
                });
            } catch (smsErr) {
                console.error('ClickSend SMS error (quick quote):', smsErr);
            }
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Serverless function error (quick quote):', error);
        return res.status(500).json({ success: false, error: 'Internal server error occurred' });
    }
}
