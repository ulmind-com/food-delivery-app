import { useState, useEffect } from 'react';

// WMO Weather interpretation codes (Rain related codes)
// 51, 53, 55: Drizzle
// 61, 63, 65: Rain
// 66, 67: Freezing Rain
// 80, 81, 82: Rain showers
// 95, 96, 99: Thunderstorm
const RAIN_CODES = [51, 53, 55, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

export function useWeather(lat?: number, lng?: number) {
  const [isRaining, setIsRaining] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lat || !lng) return;

    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`);
        const data = await res.json();
        
        if (data && data.current_weather) {
          const code = data.current_weather.weathercode;
          setIsRaining(RAIN_CODES.includes(code));
        }
      } catch (err) {
        console.error("Failed to fetch weather data", err);
        setIsRaining(false); // Default to false if API fails
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [lat, lng]);

  return { isRaining, loading };
}
