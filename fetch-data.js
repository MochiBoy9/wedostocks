const fs = require('fs');
const path = require('path');

const API_KEY = process.env.FINNHUB_TOKEN;
const FILE_PATH = path.join(__dirname, 'stock-data.json');

// add tickers here
const TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'AMD', 'INTC', 'SPY', 'QQQ', 'DIS', 'BA', 'WMT', 'JPM'];

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                 if (res.status === 429) { 
                     await new Promise(r => setTimeout(r, 2000));
                     continue;
                 }
                 throw new Error(`HTTP Error ${res.status}`);
            }
            return await res.json();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}

async function run() {
    if (!API_KEY) {
        console.error("finnhub key missing");
        process.exit(1);
    }

    let database = {};
    if (fs.existsSync(FILE_PATH)) {
        try {
            database = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8'));
        } catch (e) {
            console.error("Notice: Corrupted JSON structure. Initiating fresh archive.");
        }
    }

    const nowTimestamp = Math.floor(Date.now() / 1000);

    for (const ticker of TICKERS) {
        console.log(`Connecting terminal to ${ticker}...`);
        try {
            const data = await fetchWithRetry(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
            
            if (!database[ticker]) {
                database[ticker] = { current: {}, history: [] };
            }
            
            database[ticker].current = data;
            
            // Log current time and price to the history archive
            database[ticker].history.push({ t: nowTimestamp, c: data.c });
            
            // File Optimization: Cap history at 30 days (720 hourly entries)
            if (database[ticker].history.length > 720) {
                database[ticker].history = database[ticker].history.slice(-720);
            }
            
            // Respect Finnhub's 60 calls/minute limit by spacing out requests
            await new Promise(r => setTimeout(r, 1200)); 
        } catch (error) {
            console.error(`Fetch sequence failed for ${ticker}:`, error.message);
        }
    }

    fs.writeFileSync(FILE_PATH, JSON.stringify(database, null, 2));
    console.log("Background worker task complete. Database updated.");
}

run();
