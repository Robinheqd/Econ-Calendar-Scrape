const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const cheerio = require('cheerio');

exports.handler = async (event, context) => {
    let browser = null;
    let result = null;

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
        
        console.log(`Starting headless browser for URL: ${url}`);
        browser = await puppeteer.launch({
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle0' });

        const html = await page.content();
        const $ = cheerio.load(html);
        const events = [];

        const calendarTableRows = $('#calendar > tbody > tr');

        if (calendarTableRows.length === 0) {
            console.warn("Scraping completed, but no calendar table rows were found. The website's structure may have changed, or the content is loaded dynamically.");
            
            return {
                statusCode: 200, 
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(events),
            };
        }

        console.log(`Found ${calendarTableRows.length} potential rows to scrape.`);

        calendarTableRows.each((i, row) => {
            try {
                const columns = $(row).find('td');

                if (columns.length < 10) {
                    return;
                }
                
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

        result = {
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
        result = {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ error: `An unhandled server error occurred: ${error.message}` }),
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
    return result;
};
