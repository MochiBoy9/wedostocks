const fs = require('fs');

const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX'];
const API_KEY = process.env.FINNHUB_TOKEN; 
const FILE_PATH = './stock-data.json';

async function runTracker() {
    // here be dragons
    let dataStore = {};
    if (fs.existsSync(FILE_PATH)) {
        try {
            dataStore = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        } catch (e) {
            console.log("No valid existing data found. Creating new data tree.");
            dataStore = {};
        }
    }

    const timestamp = Math.floor(Date.now() / 1000);


    for (const ticker of TICKERS) {
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
            const quote = await response.json();

            if (!quote.c) {
                console.log(`Skipping ${ticker}: Response data was invalid.`);
                continue;
            }

            if (!dataStore[ticker]) {
                dataStore[ticker] = { current: {}, history: [] };
            }

            
            dataStore[ticker].current = {
                c: quote.c,
                h: quote.h,
                l: quote.l,
                d: quote.d,
                dp: quote.dp,
                o: quote.o
            };

            dataStore[ticker].history.push({ t: timestamp, c: quote.c });

            if (dataStore[ticker].history.length > 30) {
                dataStore[ticker].history.shift();
            }

            console.log(`we got that ${ticker}`);
        } catch (error) {
            console.error(`yo so we found an error at ${ticker}:`, error);
        }
    }
    fs.writeFileSync(FILE_PATH, JSON.stringify(dataStore, null, 2));
    console.log("the backend worked?? wow");
}

runTracker();
