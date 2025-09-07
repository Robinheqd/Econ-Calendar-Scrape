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

        // The website structure might dynamically load data. The best strategy is to target the main
        // table with a unique ID and then iterate through its rows and columns.
        const calendarTableRows = $('#calendar > tbody > tr');

        if (calendarTableRows.length === 0) {
            console.warn("Scraping completed, but no calendar table rows were found. The website's structure may have changed, or the content is loaded dynamically.");
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                body: JSON.stringify([]),
            };
        }

        console.log(`Found ${calendarTableRows.length} potential rows to scrape.`);

        calendarTableRows.each((i, row) => {
            try {
                const columns = $(row).find('td');

                // A typical event row has at least 10 columns. Header rows might have fewer.
                if (columns.length < 10) {
                    // This is likely a header row or a blank row.
                    return;
                }

                // New scraping logic that is less reliant on specific classes.
                // We're now grabbing elements based on their position in the row.
                const dateText = $(columns[0]).text().trim();
                const countryText = $(columns[1]).find('.calendar-iso').text().trim();
                const eventNameText = $(columns[2]).text().trim();
                const impactText = $(columns[3]).find('i').attr('title');
                const actualValue = $(columns[4]).text().trim();
                const previousValue = $(columns[5]).text().trim();
                const forecastValue = $(columns[6]).text().trim();
                const currencyText = $(columns[7]).text().trim();

                if (eventNameText) { 
                    events.push({
                        date: dateText,
                        country: countryText,
                        event: eventNameText,
                        impact: impactText,
                        actual: actualValue,
                        previous: previousValue,
                        estimate: forecastValue,
                        currency: currencyText,
                    });
                }
            } catch (innerError) {
                console.error(`Error processing row ${i}: ${innerError.message}`);
            }
        });

        if (events.length === 0) {
            console.warn("Scraping completed, but no valid events were found. The website structure may have changed or the date range is empty.");
        } else {
            console.log(`Successfully scraped ${events.length} events.`);
        }

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
