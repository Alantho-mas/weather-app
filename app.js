/**
 * Weather Now — a tiny weather app powered by the Open-Meteo APIs.
 * No API key required. Vanilla JS, no frameworks.
 */

const GEO_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';

// Default city shown on first load (Kochi, Kerala, India).
const DEFAULT_CITY = { lat: 9.93, lon: 76.27, label: 'Kochi, India' };

// ---- DOM references ----
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locateBtn = document.getElementById('locateBtn');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const currentCard = document.getElementById('currentCard');
const forecastEl = document.getElementById('forecast');

// ---- Weather code mapping (WMO codes from Open-Meteo) ----
function weatherInfo(code) {
    const map = {
        0: ['Clear sky', '☀️'],
        1: ['Mainly clear', '🌤️'],
        2: ['Partly cloudy', '⛅'],
        3: ['Overcast', '☁️'],
        45: ['Foggy', '🌫️'],
        48: ['Icy fog', '🌫️'],
        51: ['Light drizzle', '🌦️'],
        53: ['Drizzle', '🌦️'],
        55: ['Heavy drizzle', '🌦️'],
        61: ['Light rain', '🌧️'],
        63: ['Rain', '🌧️'],
        65: ['Heavy rain', '🌧️'],
        71: ['Light snow', '🌨️'],
        73: ['Snow', '🌨️'],
        75: ['Heavy snow', '❄️'],
        80: ['Light showers', '🌦️'],
        81: ['Showers', '🌧️'],
        82: ['Heavy showers', '🌧️'],
        95: ['Thunderstorm', '⛈️'],
        96: ['Thunderstorm with hail', '⛈️'],
        99: ['Thunderstorm with hail', '⛈️'],
    };
    const entry = map[code];
    return entry ? { text: entry[0], emoji: entry[1] } : { text: '—', emoji: '🌡️' };
}

// ---- URL builders ----
function buildForecastURL(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current: 'temperature_2,relative_humidity_2,apparent_temperature,weather_code,wind_speed_10m',
        daily: 'weather_code,temperature_2_max,temperature_2_min',
        timezone: 'auto',
        forecast_days: '6',
    });
    return `${FORECAST_URL}?${params.toString()}`;
}

// Fallback query used if the full variable set is rejected by the API.
// current_weather=true + daily weather codes are the most widely supported fields.
function buildFallbackURL(lat, lon) {
    const params = new URLSearchParams({
        latitude: lat,
        longitude: lon,
        current_weather: 'true',
        daily: 'weather_code',
        timezone: 'auto',
        forecast_days: '6',
    });
    return `${FORECAST_URL}?${params.toString()}`;
}

// ---- Helpers ----
async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return res.json();
}

function showLoading(on) {
    loadingEl.classList.toggle('hidden', !on);
}

function showError(message) {
    // textContent (never innerHTML) so city names can't inject markup.
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
}

function hideError() {
    errorEl.classList.add('hidden');
    errorEl.textContent = '';
}

function fmtTemp(value) {
    return value === null || value === undefined ? '—' : `${Math.round(value)}°C`;
}

// ---- Rendering ----
// Accepts both the full `current` payload and the `current_weather` fallback shape.
function renderCurrent(data, label) {
    let temp = null;
    let feelsLike = null;
    let humidity = null;
    let wind = null;
    let code = null;

    if (data.current) {
        const c = data.current;
        temp = c.temperature_2;
        feelsLike = c.apparent_temperature;
        humidity = c.relative_humidity_2;
        wind = c.wind_speed_10m;
        code = c.weather_code;
    } else if (data.current_weather) {
        const c = data.current_weather;
        temp = c.temperature;
        wind = c.windspeed;
        code = c.weathercode;
    }

    const info = weatherInfo(code);

    document.getElementById('cityName').textContent = label;
    document.getElementById('temperature').textContent = fmtTemp(temp);
    document.getElementById('conditionEmoji').textContent = info.emoji;
    document.getElementById('conditionText').textContent = info.text;
    document.getElementById('feelsLike').textContent = fmtTemp(feelsLike);
    document.getElementById('humidity').textContent =
        humidity === null || humidity === undefined ? '—' : `${Math.round(humidity)}%`;
    document.getElementById('wind').textContent =
        wind === null || wind === undefined ? '—' : `${Math.round(wind)} km/h`;

    currentCard.classList.remove('hidden');
}

function renderForecast(data) {
    forecastEl.replaceChildren();

    const times = data.daily.time.slice(1, 6); // next 5 days, skipping today
    times.forEach((iso, i) => {
        const idx = i + 1;
        const info = weatherInfo(data.daily.weather_code[idx]);
        const hi = data.daily.temperature_2_max ? data.daily.temperature_2_max[idx] : null;
        const lo = data.daily.temperature_2_min ? data.daily.temperature_2_min[idx] : null;
        const dayName = new Date(iso + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' });

        const card = document.createElement('div');
        card.className = 'day-card';

        const day = document.createElement('div');
        day.className = 'day';
        day.textContent = dayName;

        const emoji = document.createElement('div');
        emoji.className = 'emoji';
        emoji.textContent = info.emoji;
        emoji.setAttribute('aria-hidden', 'true');

        const temps = document.createElement('div');
        temps.className = 'temps';
        const hiEl = document.createElement('strong');
        hiEl.textContent = fmtTemp(hi);
        temps.appendChild(hiEl);
        temps.appendChild(document.createTextNode(` / ${lo === null || lo === undefined ? '—' : Math.round(lo) + '°'}`));

        card.appendChild(day);
        card.appendChild(emoji);
        card.appendChild(temps);
        forecastEl.appendChild(card);
    });

    forecastEl.classList.remove('hidden');
}

// ---- Data loading ----
async function loadWeather(lat, lon, label) {
    showLoading(true);
    hideError();
    try {
        let data = await fetchJSON(buildForecastURL(lat, lon));
        if (data.error) {
            // The full variable set can occasionally be rejected API-side;
            // retry with the widely-supported fallback fields.
            data = await fetchJSON(buildFallbackURL(lat, lon));
        }
        if (data.error || (!data.current && !data.current_weather)) {
            throw new Error('Weather service unavailable');
        }
        renderCurrent(data, label);
        renderForecast(data);
    } catch (err) {
        showError('Could not load the weather. Check your connection and try again.');
    } finally {
        showLoading(false);
    }
}

async function searchCity() {
    const query = cityInput.value.trim();
    if (!query) return;

    showLoading(true);
    hideError();
    try {
        const params = new URLSearchParams({
            name: query,
            count: '1',
            language: 'en',
            format: 'json',
        });
        const geo = await fetchJSON(`${GEO_URL}?${params.toString()}`);
        if (!geo.results || geo.results.length === 0) {
            showError(`No results found for "${query}". Try another city name.`);
            return;
        }
        const r = geo.results[0];
        const label = r.country ? `${r.name}, ${r.country}` : r.name;
        await loadWeather(r.latitude, r.longitude, label);
    } catch (err) {
        showError('Search failed. Check your connection and try again.');
    } finally {
        showLoading(false);
    }
}

function useMyLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported on this device. Search for a city instead.');
        return;
    }
    showLoading(true);
    hideError();
    navigator.geolocation.getCurrentPosition(
        (pos) => loadWeather(pos.coords.latitude, pos.coords.longitude, 'Your location'),
        () => {
            showLoading(false);
            showError('Could not get your location. Search for a city instead.');
        },
        { timeout: 10000 }
    );
}

// ---- Events ----
searchBtn.addEventListener('click', searchCity);
cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchCity();
});
locateBtn.addEventListener('click', useMyLocation);

// ---- First load: show the default city so the page is never empty ----
loadWeather(DEFAULT_CITY.lat, DEFAULT_CITY.lon, DEFAULT_CITY.label);
