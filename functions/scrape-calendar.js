const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    try {
        const { startdate, enddate } = event.queryStringParameters;

        if (!startdate || !enddate) {
            return {
                statusCode: 400,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Missing startdate or enddate query parameters.' }),
            };
        }

        const url = `https://tradingeconomics.com/calendar?start=${startdate}&end=${enddate}`;

        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const events = [];

        // Check if the calendar table exists
        const calendarTable = $('#calendar > tbody > tr');
        if (calendarTable.length === 0) {
            console.error("Scraping failed: Calendar table not found. The website structure may have changed.");
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'Scraping failed. The website structure may have changed.' }),
            };
        }

        calendarTable.each((i, row) => {
            const columns = $(row).find('td');

            if (columns.length < 10) return;

            // Use more reliable scraping by targeting specific data attributes or classes if possible
            const date = $(columns[0]).attr('data-value');
            const country = $(columns[1]).find('a').text().trim();
            const eventName = $(columns[2]).find('a').text().trim();
            const impact = $(columns[3]).find('i').attr('title'); // E.g., 'Low', 'Medium', 'High'
            const actual = $(columns[4]).text().trim();
            const previous = $(columns[5]).text().trim();
            const forecast = $(columns[6]).text().trim();
            const currency = $(columns[7]).text().trim();
            
            events.push({
                date: date,
                country: country,
                event: eventName,
                impact: impact,
                actual: actual,
                previous: previous,
                estimate: forecast,
                currency: currency,
            });
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify(events),
        };
    } catch (error) {
        console.error("An unhandled error occurred in the serverless function:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: `An unhandled server error occurred: ${error.message}` }),
        };
    }
};
