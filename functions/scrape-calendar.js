const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    try {
        const { startdate, enddate } = event.queryStringParameters;

        if (!startdate || !enddate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing startdate or enddate query parameters.' }),
            };
        }

        const url = `https://tradingeconomics.com/calendar?start=${startdate}&end=${enddate}`;

        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const events = [];

        $('#calendar > tbody > tr').each((i, row) => {
            const columns = $(row).find('td');

            if (columns.length < 10) return;

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
                // This is the fix for the CORS error
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify(events),
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: `An error occurred: ${error.message}` }),
        };
    }
};
