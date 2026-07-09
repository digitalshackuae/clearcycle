// Shared database adapter for Clearcycle IT leads
// Supports: Vercel KV (Redis), Airtable, Supabase, or Local In-Memory Fallback.

// Local in-memory fallback for local dev server testing
const localMemoryLeads = [];

export async function saveLead(lead) {
    const timestamp = new Date().toISOString();
    const leadWithTime = { ...lead, timestamp };

    // 1. Check Vercel KV (Redis via HTTP)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            const response = await fetch(process.env.KV_REST_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['RPUSH', 'clearcycle_leads', JSON.stringify(leadWithTime)])
            });
            if (response.ok) {
                console.log('Lead successfully saved to Vercel KV.');
                return true;
            }
            console.error('Vercel KV returned status:', response.status);
        } catch (err) {
            console.error('Error writing to Vercel KV:', err);
        }
    }

    // 2. Check Airtable API
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
        try {
            const baseId = process.env.AIRTABLE_BASE_ID;
            const tableName = process.env.AIRTABLE_TABLE_NAME || 'Leads';
            const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    fields: {
                        "Organisation Name": leadWithTime.orgName,
                        "Organisation Type": leadWithTime.orgType,
                        "Contact Name": leadWithTime.contactName,
                        "Contact Email": leadWithTime.contactEmail,
                        "Contact Phone": leadWithTime.contactPhone,
                        "Street Address": leadWithTime.addressStreet,
                        "City": leadWithTime.addressCity,
                        "Postcode": leadWithTime.addressPostcode,
                        "Collection Date": leadWithTime.collectionDate,
                        "Time Window": leadWithTime.collectionTime,
                        "DBS Required": leadWithTime.requireDBS ? "Yes" : "No",
                        "Onsite Destruction": leadWithTime.requireOnsite ? "Yes" : "No",
                        "Inventory": leadWithTime.inventory,
                        "Timestamp": leadWithTime.timestamp
                    }
                })
            });
            if (response.ok) {
                console.log('Lead successfully saved to Airtable.');
                return true;
            }
            console.error('Airtable API returned status:', response.status);
        } catch (err) {
            console.error('Error writing to Airtable:', err);
        }
    }

    // 3. Check Supabase API
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/clearcycle_leads`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(leadWithTime)
            });
            if (response.ok) {
                console.log('Lead successfully saved to Supabase.');
                return true;
            }
            console.error('Supabase API returned status:', response.status);
        } catch (err) {
            console.error('Error writing to Supabase:', err);
        }
    }

    // 4. Local fallback (useful for local development server logs)
    console.log('Saving lead to local memory (Mock Mode):', leadWithTime);
    localMemoryLeads.push(leadWithTime);
    return true;
}

export async function getLeads() {
    // 1. Check Vercel KV (Redis via HTTP)
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        try {
            const response = await fetch(process.env.KV_REST_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(['LRANGE', 'clearcycle_leads', 0, -1])
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.result) {
                    // Return list reversed to show newest leads first
                    return data.result.map(item => JSON.parse(item)).reverse();
                }
            }
        } catch (err) {
            console.error('Error reading from Vercel KV:', err);
        }
    }

    // 2. Check Airtable API
    if (process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID) {
        try {
            const baseId = process.env.AIRTABLE_BASE_ID;
            const tableName = process.env.AIRTABLE_TABLE_NAME || 'Leads';
            const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}?maxRecords=100&sort[0][field]=Timestamp&sort[0][direction]=desc`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data && data.records) {
                    return data.records.map(record => ({
                        orgName: record.fields["Organisation Name"],
                        orgType: record.fields["Organisation Type"],
                        contactName: record.fields["Contact Name"],
                        contactEmail: record.fields["Contact Email"],
                        contactPhone: record.fields["Contact Phone"],
                        addressStreet: record.fields["Street Address"],
                        addressCity: record.fields["City"],
                        addressPostcode: record.fields["Postcode"],
                        collectionDate: record.fields["Collection Date"],
                        collectionTime: record.fields["Time Window"],
                        requireDBS: record.fields["DBS Required"] === "Yes",
                        requireOnsite: record.fields["Onsite Destruction"] === "Yes",
                        inventory: record.fields["Inventory"],
                        timestamp: record.fields["Timestamp"]
                    }));
                }
            }
        } catch (err) {
            console.error('Error reading from Airtable:', err);
        }
    }

    // 3. Check Supabase API
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        try {
            const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/clearcycle_leads?select=*&order=timestamp.desc`, {
                method: 'GET',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
                }
            });
            if (response.ok) {
                return await response.json();
            }
        } catch (err) {
            console.error('Error reading from Supabase:', err);
        }
    }

    // 4. Local fallback
    console.log('Retrieving leads from local memory (Mock Mode). Count:', localMemoryLeads.length);
    // Return copy of memory list reversed
    return [...localMemoryLeads].reverse();
}
