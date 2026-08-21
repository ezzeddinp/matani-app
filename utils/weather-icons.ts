import type { ImageSourcePropType } from "react-native";

export type WeatherIconKey =
  | "sunny"
  | "partlyCloudy"
  | "cloudy"
  | "lightDrizzle"
  | "rainy"
  | "rainySun"
  | "thunderstorm"
  | "lightning"
  | "sleet"
  | "snow"
  | "snowfall"
  | "night"
  | "default";

const WEATHER_ICON_SOURCES: Record<WeatherIconKey, ImageSourcePropType> = {
  sunny: require("../assets/weather-icons/Icon=Sunny.png"),
  partlyCloudy: require("../assets/weather-icons/Icon=Partly Cloudy.png"),
  cloudy: require("../assets/weather-icons/Icon=Cloudy.png"),
  lightDrizzle: require("../assets/weather-icons/Icon=Light Drizzle.png"),
  rainy: require("../assets/weather-icons/Icon=Rainy.png"),
  rainySun: require("../assets/weather-icons/Icon=Rainy with Sun.png"),
  thunderstorm: require("../assets/weather-icons/Icon=Thunderstorm.png"),
  lightning: require("../assets/weather-icons/Icon=Lightning.png"),
  sleet: require("../assets/weather-icons/Icon=Sleet.png"),
  snow: require("../assets/weather-icons/Icon=Snow.png"),
  snowfall: require("../assets/weather-icons/Icon=Snowfall.png"),
  night: require("../assets/weather-icons/Icon=Night.png"),
  default: require("../assets/weather-icons/Icon=Cloudy.png"),
};

export const getWeatherIconSource = (
  key?: WeatherIconKey | null
): ImageSourcePropType => {
  if (!key) {
    return WEATHER_ICON_SOURCES.default;
  }
  return WEATHER_ICON_SOURCES[key] ?? WEATHER_ICON_SOURCES.default;
};

export const mapWmoWeatherCodeToIconKey = (
  code: number | null
): WeatherIconKey => {
  if (code === null || Number.isNaN(code)) {
    return "cloudy";
  }

  const numeric = Math.round(code);

  if (numeric === 0) return "sunny";
  if ([1, 2].includes(numeric)) return "partlyCloudy";
  if ([3, 45, 48].includes(numeric)) return "cloudy";
  if ([51, 53, 55].includes(numeric)) return "lightDrizzle";
  if ([56, 57, 66, 67].includes(numeric)) return "sleet";
  if ([61, 63, 65, 80, 81, 82].includes(numeric)) return "rainy";
  if ([71, 73, 75, 77, 85, 86].includes(numeric)) return "snowfall";
  if ([95, 96, 99].includes(numeric)) return "thunderstorm";

  return "cloudy";
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
  if (typeof rainfall === "number" && rainfall >= 2) {
    return "rainy";
  }
  if (typeof rainfall === "number" && rainfall > 0) {
    return "lightDrizzle";
  }
  if (typeof humidity === "number" && humidity >= 80) {
    return "cloudy";
  }
  if (typeof temperature === "number" && temperature >= 30) {
    return "sunny";
  }
  return "partlyCloudy";
};
