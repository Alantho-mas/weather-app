# Weather Now

A clean, responsive weather web app — search any city and get live current conditions plus a 5-day forecast. No sign-up, no API key.

## Features

- City search with live geocoding (type a name, press Enter or click Search)
- "Use my location" button via browser geolocation (graceful fallback if denied)
- Current weather card: temperature, condition, feels-like, humidity, wind
- 5-day forecast with day names, condition icons, and high/low temperatures
- Loading indicator and friendly error messages (unknown city, network failure)
- Graceful API fallback: if the full forecast query is ever rejected, the app retries with widely-supported fields instead of breaking
- Default city (Kochi, India) loads on first visit so the page is never empty

## Tech Stack

- HTML5
- CSS3 (custom properties, glassmorphism cards, responsive grid)
- Vanilla JavaScript (async/await, Fetch API — no frameworks)
- [Open-Meteo API](https://open-meteo.com/) — free, no API key required

## API Credit

Weather and geocoding data by [Open-Meteo](https://open-meteo.com/) — free for non-commercial use, no key needed.

## How to Run

No build step or installation needed. Open `index.html` in any modern browser, or serve the folder locally:

```bash
npx serve .
```

Then visit the printed local URL.

## Project Structure

```
├── index.html   # Page layout: header, search bar, weather cards, forecast
├── style.css    # Styling: CSS variables, gradient background, glassy cards, responsive grid
├── app.js       # Logic: geocoding, forecast fetching, WMO code mapping, rendering
└── README.md
```
