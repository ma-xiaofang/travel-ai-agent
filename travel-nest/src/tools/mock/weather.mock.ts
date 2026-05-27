import type { WeatherSnapshot } from './types.js';

export const MOCK_WEATHER: Record<string, WeatherSnapshot> = {
  河南: { temp: 28, feels: 30, weather: '晴', humidity: 50, wind: '东南风2级' },
  郑州: { temp: 27, feels: 29, weather: '多云', humidity: 52, wind: '东南风2级' },
  洛阳: { temp: 26, feels: 27, weather: '晴', humidity: 48, wind: '西北风2级' },
  开封: { temp: 29, feels: 31, weather: '晴', humidity: 55, wind: '东风2级' },
  巴黎: { temp: 18, feels: 16, weather: '多云', humidity: 68, wind: '西风2级' },
  曼谷: { temp: 33, feels: 38, weather: '晴', humidity: 75, wind: '南风1级' },
  巴厘岛: { temp: 30, feels: 34, weather: '阵雨', humidity: 82, wind: '东南风2级' },
  北京: { temp: 25, feels: 23, weather: '晴', humidity: 40, wind: '北风3级' },
  上海: { temp: 28, feels: 30, weather: '多云', humidity: 70, wind: '东风2级' },
  武汉: { temp: 30, feels: 33, weather: '晴', humidity: 65, wind: '东南风2级' },
  广州: { temp: 32, feels: 36, weather: '雷阵雨', humidity: 85, wind: '南风1级' },
  纽约: { temp: 20, feels: 18, weather: '晴', humidity: 50, wind: '西风4级' },
  悉尼: { temp: 16, feels: 14, weather: '晴', humidity: 62, wind: '南风3级' },
  首尔: { temp: 19, feels: 17, weather: '多云', humidity: 60, wind: '西北风2级' },
  新加坡: { temp: 31, feels: 36, weather: '雷阵雨', humidity: 85, wind: '南风1级' },
};

const DEFAULT_WEATHER: WeatherSnapshot = {
  temp: 22,
  feels: 20,
  weather: '晴',
  humidity: 60,
  wind: '微风',
};

const weatherApiKey =
  process.env.WEATHER_API_KEY || process.env.OPEN_WEATHER_API_KEY || '';

function getClothingAdvice(temp: number): string {
  if (temp >= 30) return '🌡️ 炎热，建议穿轻薄透气短袖短裤，做好防晒';
  if (temp >= 25) return '☀️ 温暖舒适，短袖加薄外套即可';
  if (temp >= 18) return '🍃 气温适宜，长袖加薄外套，早晚偏凉';
  if (temp >= 10) return '🧥 较凉爽，建议穿外套或毛衣';
  return '❄️ 寒冷，需要穿厚外套或羽绒服';
}

function formatWeatherAnswer(city: string, data: WeatherSnapshot): string {
  return `🌤️ **${city}实时天气**

温度：${data.temp}°C（体感 ${data.feels}°C）
天气：${data.weather}
湿度：${data.humidity}%
风力：${data.wind}

**穿衣建议：** ${getClothingAdvice(data.temp)}
**出行提示：** ${data.weather.includes('雨') ? '☔ 建议携带雨伞' : '✅ 天气适合出行'}`;
}

export async function buildWeatherMock(city: string): Promise<string> {
  if (weatherApiKey) {
    try {
      const resp = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${weatherApiKey}&units=metric&lang=zh_cn`,
      );
      const raw = await resp.json();
      const data: WeatherSnapshot = {
        temp: Math.round(raw.main.temp),
        feels: Math.round(raw.main.feels_like),
        weather: raw.weather[0].description,
        humidity: raw.main.humidity,
        wind: `${raw.wind.speed}m/s`,
      };
      return formatWeatherAnswer(city, data);
    } catch {
      // 回退到内置 mock
    }
  }

  const key = Object.keys(MOCK_WEATHER).find(
    (k) => city.includes(k) || k.includes(city),
  );
  const data = key ? MOCK_WEATHER[key] : DEFAULT_WEATHER;
  return formatWeatherAnswer(city, data);
}
