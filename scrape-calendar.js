const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    try {
        // Extract start and end dates from the query string
        const { startdate, enddate } = event.queryStringParameters;

        if (!startdate || !enddate) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing startdate or enddate query parameters.' }),
            };
        }

        // The URL for the Trading Economics calendar page, with date range parameters
        const url = `https://tradingeconomics.com/calendar?start=${startdate}&end=${enddate}`;

        // Fetch the HTML content from the page
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const events = [];

        // Scrape the data from the table rows
        $('#calendar > tbody > tr').each((i, row) => {
            const columns = $(row).find('td');

            // Skip rows that don't have enough columns
            if (columns.length < 10) return;

            // Extract data from each column
            const date = $(columns[0]).attr('data-value');
            const country = $(columns[1]).find('a').text().trim();
            const eventName = $(columns[2]).find('a').text().trim();
            const impact = $(columns[3]).find('i').attr('title');
            const actual = $(columns[4]).text().trim();
            const previous = $(columns[5]).text().trim();
            const forecast = $(columns[6]).text().trim();
            const currency = $(columns[7]).text().trim();
            
            // Push the scraped data into the events array
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

        // Return the scraped data as a JSON response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(events),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `An error occurred: ${error.message}` }),
        };
    }
};
