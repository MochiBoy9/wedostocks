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

    // 2. Fetch fresh quote stats for each preset card asset
    for (const ticker of TICKERS) {
        try {
            const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
            const quote = await response.json();

            if (!quote.c) {
                console.log(`Skipping ${ticker}: Response data was invalid.`);
                continue;
            }

            // Initialize structural map branches if missing
            if (!dataStore[ticker]) {
                dataStore[ticker] = { current: {}, history: [] };
            }

            // Update live metrics cards block data
            dataStore[ticker].current = {
                c: quote.c,
                h: quote.h,
                l: quote.l,
                d: quote.d,
                dp: quote.dp,
                o: quote.o
            };

            // Append tracking point to data history array
            dataStore[ticker].history.push({ t: timestamp, c: quote.c });

            // Cap the history at 30 entries so the file stays lightweight
            if (dataStore[ticker].history.length > 30) {
                dataStore[ticker].history.shift();
            }

            console.log(`Successfully tracked and appended data point for ${ticker}`);
        } catch (error) {
            console.error(`Failed connection query loop on ticker node ${ticker}:`, error);
        }
    }

    // 3. Save the updated store matrix back to the file system
    fs.writeFileSync(FILE_PATH, JSON.stringify(dataStore, null, 2));
    console.log("Stock tracking file matrix successfully saved.");
}

runTracker();
