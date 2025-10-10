import type { ImageSourcePropType } from 'react-native';

export type WeatherIconKey =
  | 'sunny'
  | 'partlyCloudy'
  | 'cloudy'
  | 'lightDrizzle'
  | 'rainy'
  | 'rainySun'
  | 'thunderstorm'
  | 'lightning'
  | 'sleet'
  | 'snow'
  | 'snowfall'
  | 'night'
  | 'default';

const WEATHER_ICON_SOURCES: Record<WeatherIconKey, ImageSourcePropType> = {
  sunny: require('../assets/weather-icons/Icon=Sunny.png'),
  partlyCloudy: require('../assets/weather-icons/Icon=Partly Cloudy.png'),
  cloudy: require('../assets/weather-icons/Icon=Cloudy.png'),
  lightDrizzle: require('../assets/weather-icons/Icon=Light Drizzle.png'),
  rainy: require('../assets/weather-icons/Icon=Rainy.png'),
  rainySun: require('../assets/weather-icons/Icon=Rainy with Sun.png'),
  thunderstorm: require('../assets/weather-icons/Icon=Thunderstorm.png'),
  lightning: require('../assets/weather-icons/Icon=Lightning.png'),
  sleet: require('../assets/weather-icons/Icon=Sleet.png'),
  snow: require('../assets/weather-icons/Icon=Snow.png'),
  snowfall: require('../assets/weather-icons/Icon=Snowfall.png'),
  night: require('../assets/weather-icons/Icon=Night.png'),
  default: require('../assets/weather-icons/Icon=Cloudy.png'),
};

export const getWeatherIconSource = (key?: WeatherIconKey | null): ImageSourcePropType => {
  if (!key) {
    return WEATHER_ICON_SOURCES.default;
  }
  return WEATHER_ICON_SOURCES[key] ?? WEATHER_ICON_SOURCES.default;
};

export const mapAccuWeatherCodeToIconKey = (code: number | null): WeatherIconKey => {
  if (code === null || Number.isNaN(code)) {
    return 'cloudy';
  }

  const numeric = Math.round(code);

  if ([1].includes(numeric)) return 'sunny';
  if ([2, 3, 4, 5].includes(numeric)) return 'partlyCloudy';
  if ([6, 7, 8].includes(numeric)) return 'cloudy';
  if ([11].includes(numeric)) return 'lightDrizzle';
  if ([12, 13, 14, 18, 24, 25, 26].includes(numeric)) return 'rainy';
  if ([29].includes(numeric)) return 'rainySun';
  if ([15, 16, 17].includes(numeric)) return 'thunderstorm';
  if ([30].includes(numeric)) return 'lightning';
  if ([31, 32].includes(numeric)) return 'sleet';
  if ([19, 20, 21, 22, 23].includes(numeric)) return 'snow';
  if ([33, 34].includes(numeric)) return 'night';
  if ([35, 36].includes(numeric)) return 'snowfall';
  if ([37, 38, 39, 40].includes(numeric)) return 'thunderstorm';
  if ([41, 42, 43, 44].includes(numeric)) return 'snowfall';

  return 'cloudy';
};

interface SummaryIconInput {
  rainfall?: number | null;
  humidity?: number | null;
  temperature?: number | null;
}

export const deriveSummaryIconKey = ({
  rainfall,
  humidity,
  temperature,
}: SummaryIconInput): WeatherIconKey => {
  if (typeof rainfall === 'number' && rainfall >= 2) {
    return 'rainy';
  }
  if (typeof rainfall === 'number' && rainfall > 0) {
    return 'lightDrizzle';
  }
  if (typeof humidity === 'number' && humidity >= 80) {
    return 'cloudy';
  }
  if (typeof temperature === 'number' && temperature >= 30) {
    return 'sunny';
  }
  return 'partlyCloudy';
};
