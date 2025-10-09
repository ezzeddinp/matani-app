import { LatLng } from 'react-native-maps';

export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type NdviHistoryPoint = {
  date: Date;
  value: number;
};

export type SyntheticNdviSummary = {
  centroid: Coordinate;
  ndviHistory: NdviHistoryPoint[];
  ndviCurrent: number;
  ndviPrevious: number;
  ndviChange: number;
  ndviTrendPercent: number;
};

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const toRadians = (value: number) => (value * Math.PI) / 180;

export const getDayOfYear = (date: Date) => {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

export const buildNdviSeries = (
  lat: number,
  lon: number,
  areaHa = 1,
  referenceDate: Date,
  points = 6
): NdviHistoryPoint[] => {
  const baseSeed = lat * 12.9898 + lon * 78.233 + (areaHa ?? 1) * 37.719;
  const deterministicNoise = (seed: number) => {
    const raw = Math.sin(seed) * 10000;
    return raw - Math.floor(raw);
  };

  const fertilityNoise = deterministicNoise(baseSeed);
  const tierRanges: [number, number] =
    fertilityNoise > 0.7
      ? [0.68, 0.88]
      : fertilityNoise > 0.4
        ? [0.36, 0.68]
        : [0.12, 0.38];

  const [tierMin, tierMax] = tierRanges;
  const tierMid = (tierMin + tierMax) / 2;
  const tierAmplitude = (tierMax - tierMin) / 2;
  const dayOfYear = getDayOfYear(referenceDate);

  return Array.from({ length: points }, (_, index) => {
    const daysAgo = (points - index - 1) * 6;
    const day = dayOfYear - daysAgo;
    const seasonal = Math.sin(toRadians(day + lat * 3.5))
      + 0.6 * Math.cos(toRadians((lon + areaHa * 7) * 2 + day * 0.8));
    const micro = deterministicNoise(baseSeed + index * 13.357) * 2 - 1;
    const composite = clamp(0.45 * seasonal + 0.2 * micro, -1.2, 1.2);
    const ndviCentral = tierMid + composite * tierAmplitude;
    const ndvi = clamp(ndviCentral, 0.05, 0.95);

    const date = new Date(referenceDate);
    date.setDate(referenceDate.getDate() - daysAgo);

    return {
      date,
      value: Number(ndvi.toFixed(3)),
    };
  });
};

export const computeSyntheticNdvi = (
  coords: Coordinate,
  areaHa: number | null | undefined,
  referenceDate: Date = new Date()
): SyntheticNdviSummary => {
  const ndviHistory = buildNdviSeries(coords.latitude, coords.longitude, areaHa ?? 1, referenceDate);
  const ndviCurrent = ndviHistory.at(-1)?.value ?? 0.65;
  const ndviPrevious = ndviHistory.at(-2)?.value ?? ndviCurrent;
  const ndviChange = ndviCurrent - ndviPrevious;
  const ndviTrendPercent = clamp(ndviChange / (Math.abs(ndviPrevious) || 0.01), -0.5, 0.5) * 100;

  return {
    centroid: coords,
    ndviHistory,
    ndviCurrent,
    ndviPrevious,
    ndviChange,
    ndviTrendPercent,
  };
};

export const computePolygonCentroid = (polygon: LatLng[]): Coordinate | null => {
  if (!Array.isArray(polygon) || polygon.length === 0) {
    return null;
  }

  type CentroidAccumulator = { latitude: number; longitude: number; count: number };

  const accumulator = polygon.reduce<CentroidAccumulator>(
    (acc, point) => {
      if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
        return acc;
      }

      return {
        latitude: acc.latitude + point.latitude,
        longitude: acc.longitude + point.longitude,
        count: acc.count + 1,
      };
    },
    { latitude: 0, longitude: 0, count: 0 }
  );

  if (accumulator.count === 0) {
    return null;
  }

  return {
    latitude: accumulator.latitude / accumulator.count,
    longitude: accumulator.longitude / accumulator.count,
  };
};

export const computeSyntheticNdviForPolygon = (
  polygon: LatLng[],
  areaHa?: number | null
): SyntheticNdviSummary | null => {
  const centroid = computePolygonCentroid(polygon);
  if (!centroid) {
    return null;
  }

  return computeSyntheticNdvi(centroid, areaHa ?? undefined, new Date());
};
