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

        const calendarTableRows = $('#calendar > tbody > tr');
        
        if (calendarTableRows.length === 0) {
            console.warn("Scraping completed, but no calendar table rows were found.");
            return {
                statusCode: 200, // Return 200 with an empty array if no events are found
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                },
                body: JSON.stringify(events),
            };
        }

        calendarTableRows.each((i, row) => {
            try {
                const columns = $(row).find('td');

                if (columns.length < 10) {
                    // This is a header row or an empty row, continue to the next one
                    return;
                }
                
                const dateElement = $(columns[0]).find('span');
                const countryElement = $(columns[1]).find('table tr:nth-child(1) td:nth-child(2)');
                const eventNameElement = $(columns[2]).find('a');
                const impactElement = $(columns[3]).find('i');
                const actualElement = $(columns[4]).find('#actual');
                const previousElement = $(columns[5]).find('#previous');
                const forecastElement = $(columns[6]).find('#consensus');
                const currencyElement = $(columns[7]); 

                const date = dateElement.length ? dateElement.text().trim() : '';
                const country = countryElement.length ? countryElement.text().trim() : '';
                const eventName = eventNameElement.length ? eventNameElement.text().trim() : '';
                const impact = impactElement.length ? impactElement.attr('title') : '';
                const actual = actualElement.length ? actualElement.text().trim() : '';
                const previous = previousElement.length ? previousElement.text().trim() : '';
                const forecast = forecastElement.length ? forecastElement.text().trim() : '';
                const currency = currencyElement.length ? currencyElement.text().trim() : '';

                if (eventName) { // Only push if there is an event name
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
                }
            } catch (innerError) {
                console.error(`Error processing row ${i}: ${innerError.message}`);
                // Continue to the next row
            }
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
