import express from 'express';
import fetch from 'node-fetch';

const app = express();
app.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // dev only
    next();
});

/** Binance Spot/Futures klines (2h interval is '2h')
 *  Docs: /api/v3/klines (spot) or /fapi/v1/klines (USDT futures)
 *  interval strings include '2h'
 */
app.get('/api/binance/klines', async (req, res) => {
    try {
        const { symbol='WIFUSDT', interval='2h', limit='500', market='spot' } = req.query;
        const base = market === 'futures' ? 'https://fapi.binance.com' : 'https://api.binance.com';
        const url  = `${base}/api/${market==='futures'?'v1':'v3'}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const r = await fetch(url);
        const j = await r.json();
        // map to your Candle
        const candles = j.map(k => ({
            t: k[0],        // open time ms
            o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5],
        }));
        res.json(candles);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

/** Bybit v5 kline (2h interval is '120')
 *  Docs: GET /v5/market/kline with interval=120 (minutes)
 */
app.get('/api/bybit/kline', async (req, res) => {
    try {
        const { symbol='WIFUSDT', category='linear', interval='120', limit='500' } = req.query;
        const url = `https://api.bybit.com/v5/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${limit}`;
        const r = await fetch(url);
        const j = await r.json();
        if (j.retCode !== 0) return res.status(400).json(j);
        // j.result.list is newest->oldest; normalize & reverse
        const list = (j.result.list || []).slice().reverse();
        const candles = list.map(k => ({
            t: +k[0],       // start time ms
            o: +k[1], h: +k[2], l: +k[3], c: +k[4], v: +k[5],
        }));
        res.json(candles);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(8080, () => console.log('Proxy on http://localhost:8080'));
