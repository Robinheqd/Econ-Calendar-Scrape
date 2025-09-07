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

        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            },
        });

        const $ = cheerio.load(data);
        const events = [];

        // Updated scraping logic to be more resilient
        const calendarTableRows = $('#calendar > tbody > tr[data-te-id]');
        
        if (calendarTableRows.length === 0) {
            console.error("Scraping failed: No events found with data-te-id attribute. The website structure may have changed.");
            return {
                statusCode: 404, // Use 404 for "not found"
                headers: {
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ error: 'No economic events found for the specified date range. The website structure may have changed or there are no events.', details: `Attempted to scrape from URL: ${url}` }),
            };
        }

        calendarTableRows.each((i, row) => {
            const columns = $(row).find('td');

            if (columns.length < 10) {
                console.warn(`Skipping row ${i} due to insufficient columns. HTML: ${$(row).html()}`);
                return;
            }

            const date = $(columns[0]).attr('data-value');
            const country = $(columns[1]).find('a').text().trim();
            const eventName = $(columns[2]).find('a').text().trim();
            const impact = $(columns[3]).find('i').attr('title');
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
