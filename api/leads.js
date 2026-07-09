// Vercel Serverless Function: /api/leads.js
// Securely retrieves leads from the database. Gated by password authentication.

import { getLeads } from './db.js';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // Authenticate request using header or query parameter
        const clientPassword = req.headers['x-admin-password'] || req.query.password;
        const correctPassword = process.env.ADMIN_PASSWORD || 'ClearcycleAdmin2026!';

        if (!clientPassword || clientPassword !== correctPassword) {
            return res.status(401).json({ success: false, error: 'Unauthorized: Invalid admin password' });
        }

        // Fetch leads
        const leads = await getLeads();
        return res.status(200).json({ success: true, leads });

    } catch (error) {
        console.error('Serverless function leads fetch error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
}
