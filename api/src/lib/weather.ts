import axios from 'axios'

// Shared by weather.ts (GET /weather) and displayStats.ts (GET
// /display-stats) — both old Express routes duplicated this exact
// axios call and code-to-text map; factored out rather than copied twice.

const WEATHER_CODE_TEXT: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Freezing drizzle',
  57: 'Freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Heavy rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

export function weatherCodeToText(code: number): string {
  return WEATHER_CODE_TEXT[code] ?? 'Unknown'
}

export interface CurrentWeather {
  temperature: number
  weathercode: number
  time: string
}

export async function getCurrentWeather(): Promise<CurrentWeather | null> {
  const latitude = process.env.WEATHER_LAT ?? '40.6782'
  const longitude = process.env.WEATHER_LON ?? '-73.9442'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&temperature_unit=fahrenheit&timezone=America%2FNew_York`

  const res = await axios.get<{ current_weather?: CurrentWeather }>(url)
  return res.data?.current_weather ?? null
}
