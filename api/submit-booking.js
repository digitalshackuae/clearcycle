// Vercel Serverless Function: /api/submit-booking.js
// Handles Node.js serverless POST requests to email form notifications via Resend API.

import { saveLead } from './db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
            orgName,
            orgType,
            contactName,
            contactEmail,
            contactPhone,
            addressStreet,
            addressCity,
            addressPostcode,
            collectionDate,
            collectionTime,
            requireDBS,
            requireOnsite,
            inventory
        } = req.body;

        // Basic validation
        if (!orgName || !contactName || !contactEmail || !contactPhone || !addressStreet || !addressCity || !addressPostcode || !collectionDate) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Durable fallback record: always visible in Vercel function logs, even if
        // no storage backend or Resend key is configured yet, so no booking is
        // ever silently lost.
        console.log('BOOKING REQUEST:', JSON.stringify({ orgName, orgType, contactName, contactEmail, contactPhone, addressStreet, addressCity, addressPostcode, collectionDate, collectionTime, requireDBS, requireOnsite, inventory, timestamp: new Date().toISOString() }));

        // Save the lead immediately so it's captured regardless of whether the
        // email notification below succeeds.
        try {
            await saveLead({
                orgName,
                orgType,
                contactName,
                contactEmail,
                contactPhone,
                addressStreet,
                addressCity,
                addressPostcode,
                collectionDate,
                collectionTime,
                requireDBS,
                requireOnsite,
                inventory
            });
        } catch (dbErr) {
            console.error('Database lead save error:', dbErr);
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
            console.warn('RESEND_API_KEY not configured - booking email notification skipped, lead saved via saveLead/log only.');
            return res.status(200).json({ success: true });
        }

        // Get notification email list
        const notificationEmailsEnv = process.env.NOTIFICATION_EMAILS || 'digitalshackuae@gmail.com,info@clearcycleit.co.uk';
        const toEmails = notificationEmailsEnv
            .split(',')
            .map(email => email.trim())
            .filter(email => email.length > 0);

        if (toEmails.length === 0) {
            console.warn('No notification email addresses configured - skipping email notification.');
            return res.status(200).json({ success: true });
        }

        // Format dates nicely
        let displayDate = collectionDate;
        try {
            const dateParts = collectionDate.split('-');
            if (dateParts.length === 3) {
                displayDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
            }
        } catch (e) {
            // Keep original
        }

        // Format DBS and Onsite flags
        const dbsLabel = requireDBS ? 'Yes (DBS-Checked Team Required)' : 'No';
        const onsiteLabel = requireOnsite ? 'Yes (On-site Drive Wiping Requested)' : 'No';

        // Email Subject
        const subject = `New IT Collection Booking - ${orgName}`;

        // HTML Email Template matching the Clearcycle IT navy/green aesthetic
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>New IT Collection Booking Request</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333333;
                    background-color: #f4f6f8;
                    margin: 0;
                    padding: 0;
                }
                .email-wrapper {
                    max-width: 600px;
                    margin: 20px auto;
                    background-color: #ffffff;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    border: 1px solid #e1e8ed;
                }
                .email-header {
                    background-color: #0b1a2d; /* Dark navy */
                    padding: 30px;
                    text-align: center;
                    border-bottom: 3px solid #61ce70; /* Green accent */
                }
                .email-header h1 {
                    color: #ffffff;
                    margin: 0;
                    font-size: 24px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                .email-body {
                    padding: 30px;
                }
                .section-title {
                    font-size: 16px;
                    font-weight: bold;
                    color: #0b1a2d;
                    text-transform: uppercase;
                    border-bottom: 2px solid #e1e8ed;
                    padding-bottom: 8px;
                    margin-top: 30px;
                    margin-bottom: 15px;
                }
                .section-title:first-of-type {
                    margin-top: 0;
                }
                .info-grid {
                    width: 100%;
                    border-collapse: collapse;
                }
                .info-row td {
                    padding: 8px 0;
                    vertical-align: top;
                }
                .info-label {
                    width: 35%;
                    font-weight: 600;
                    color: #555555;
                }
                .info-value {
                    width: 65%;
                    color: #111111;
                }
                .inventory-box {
                    background-color: #f8fafc;
                    border: 1px dashed #cbd5e1;
                    border-radius: 6px;
                    padding: 15px;
                    font-family: monospace;
                    font-size: 14px;
                    color: #0f172a;
                    white-space: pre-wrap;
                    line-height: 1.5;
                }
                .email-footer {
                    background-color: #f8fafc;
                    padding: 20px;
                    text-align: center;
                    border-top: 1px solid #e1e8ed;
                    font-size: 12px;
                    color: #64748b;
                }
            </style>
        </head>
        <body>
            <div class="email-wrapper">
                <div class="email-header">
                    <h1>Clearcycle IT</h1>
                </div>
                <div class="email-body">
                    <h2 style="margin-top: 0; color: #0b1a2d; font-size: 20px;">New IT Collection Request</h2>
                    <p style="color: #64748b; font-size: 14px; margin-bottom: 25px;">A new B2B IT recycling collection has been requested via the website eligibility checker and booking form.</p>

                    <div class="section-title">Organisation Details</div>
                    <table class="info-grid">
                        <tr class="info-row">
                            <td class="info-label">Name</td>
                            <td class="info-value"><strong>${orgName}</strong></td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">Type</td>
                            <td class="info-value" style="text-transform: capitalize;">${orgType}</td>
                        </tr>
                    </table>

                    <div class="section-title">Contact Information</div>
                    <table class="info-grid">
                        <tr class="info-row">
                            <td class="info-label">Contact Name</td>
                            <td class="info-value">${contactName}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">Email Address</td>
                            <td class="info-value"><a href="mailto:${contactEmail}" style="color: #61ce70; text-decoration: none;">${contactEmail}</a></td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">Phone Number</td>
                            <td class="info-value">${contactPhone}</td>
                        </tr>
                    </table>

                    <div class="section-title">Collection Address</div>
                    <table class="info-grid">
                        <tr class="info-row">
                            <td class="info-label">Street Address</td>
                            <td class="info-value">${addressStreet}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">City</td>
                            <td class="info-value">${addressCity}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">Postcode</td>
                            <td class="info-value" style="text-transform: uppercase;">${addressPostcode}</td>
                        </tr>
                    </table>

                    <div class="section-title">Logistics & Requirements</div>
                    <table class="info-grid">
                        <tr class="info-row">
                            <td class="info-label">Preferred Date</td>
                            <td class="info-value">${displayDate}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">Time Window</td>
                            <td class="info-value" style="text-transform: capitalize;">${collectionTime}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">DBS Team Required</td>
                            <td class="info-value">${dbsLabel}</td>
                        </tr>
                        <tr class="info-row">
                            <td class="info-label">On-site Destruction</td>
                            <td class="info-value">${onsiteLabel}</td>
                        </tr>
                    </table>

                    <div class="section-title">IT Equipment Inventory</div>
                    <div class="inventory-box">${inventory}</div>
                </div>
                <div class="email-footer">
                    <p>&copy; 2026 Clearcycle IT. All rights reserved.</p>
                    <p>Sent securely from website booking agent via Resend.</p>
                </div>
            </div>
        </body>
        </html>
        `;

        // Prepare the Resend email request
        const emailSendPromise = fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: 'Clearcycle IT Booking <noreply@clearcycleit.co.uk>',
                to: toEmails,
                subject: subject,
                html: html
            })
        }).catch(err => {
            console.error('Resend fetch error:', err);
            return null;
        });

        // Prepare the ClickSend SMS request if credentials are configured
        let smsSendPromise = Promise.resolve(null);
        const clicksendUsername = process.env.CLICKSEND_USERNAME;
        const clicksendApiKey = process.env.CLICKSEND_API_KEY;
        const clicksendToNumber = process.env.CLICKSEND_TO_NUMBER;

        if (clicksendUsername && clicksendApiKey && clicksendToNumber) {
            const authString = Buffer.from(`${clicksendUsername}:${clicksendApiKey}`).toString('base64');
            const smsBody = `Clearcycle IT: New collection booking from ${orgName}. Contact: ${contactName} (${contactPhone}). Date: ${displayDate}.`;

            // Split the comma-separated phone numbers, clean them, and format to E.164
            const rawNumbers = clicksendToNumber.split(',').map(num => num.trim()).filter(num => num.length > 0);
            const messages = rawNumbers.map(num => {
                let formattedNum = num;
                // Convert leading 0 to +44 for UK numbers
                if (formattedNum.startsWith('0') && !formattedNum.startsWith('00')) {
                    formattedNum = '+44' + formattedNum.substring(1);
                } else if (formattedNum.startsWith('7')) {
                    formattedNum = '+44' + formattedNum;
                }
                return {
                    source: 'vercel-api',
                    body: smsBody,
                    to: formattedNum
                };
            });

            smsSendPromise = fetch('https://rest.clicksend.com/v3/sms/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${authString}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ messages })
            }).catch(err => {
                console.error('ClickSend fetch error:', err);
                return null;
            });
        } else {
            console.log('ClickSend SMS credentials or recipient number not configured');
        }

        // Wait for both API calls to complete
        const [emailResponse, smsResponse] = await Promise.all([emailSendPromise, smsSendPromise]);

        // Log SMS status
        if (smsResponse) {
            if (smsResponse.ok) {
                console.log('ClickSend SMS sent successfully');
            } else {
                try {
                    const smsData = await smsResponse.json();
                    console.error('ClickSend API returned an error:', smsData);
                } catch (e) {
                    console.error('ClickSend API returned an error (failed to parse response JSON)');
                }
            }
        }

        // The lead was already saved above, so a failed or unreachable email
        // send is logged but must not fail the visitor's submission - the
        // booking has already been captured.
        if (!emailResponse) {
            console.error('Resend email request could not be sent (network error).');
        } else if (!emailResponse.ok) {
            try {
                const data = await emailResponse.json();
                console.error('Resend API returned an error:', data);
            } catch (e) {
                console.error('Resend API returned an error (failed to parse response JSON)');
            }
        } else {
            console.log('Booking confirmation email sent successfully');
        }

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Serverless function error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error occurred' });
    }
}
