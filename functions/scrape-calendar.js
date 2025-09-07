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

        // Updated selector to find the table rows.
        // The table has a tbody with tr elements, which contain the event data.
        const calendarTableRows = $('#calendar > tbody > tr');

        if (calendarTableRows.length === 0) {
            console.warn("Scraping completed, but no calendar table rows were found.");
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
        }

        calendarTableRows.each((i, row) => {
            try {
                const columns = $(row).find('td');

                if (columns.length < 10) {
                    // This is likely a header row or a blank row, skip it.
                    return;
                }
                
                // Using more resilient selectors based on the provided HTML
                const dateText = $(columns[0]).find('span.event-1').text().trim() || $(columns[0]).find('span').text().trim();
                const countryText = $(columns[1]).find('td.calendar-iso').text().trim();
                const eventNameText = $(columns[2]).find('a.calendar-event').text().trim();
                const impactText = $(columns[3]).find('i').attr('title');
                const actualValue = $(columns[4]).find('#actual').text().trim();
                const previousValue = $(columns[5]).find('#previous').text().trim();
                const forecastValue = $(columns[6]).find('#consensus').text().trim();
                
                // The currency is not easily scraped from the provided HTML. Leaving it empty for now.
                const currencyText = '';

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
                // Continue to the next row, as the outer try/catch will handle the final response.
            }
        });

        if (events.length === 0) {
            console.warn("Scraping completed, but no valid events were found.");
            // Return a 200 with an empty array if no events match the scraping logic.
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
