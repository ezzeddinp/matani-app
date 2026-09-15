export const observationChartX = (
  timestamp: string,
  start: string,
  end: string,
  padding: number,
  width: number,
) => {
  const first = Date.parse(start);
  const last = Date.parse(end);
  const current = Date.parse(timestamp);
  if (![first, last, current].every(Number.isFinite) || last < first || current < first || current > last) {
    throw new Error('Invalid observation date range');
  }
  return padding + (last === first ? width / 2 : ((current - first) / (last - first)) * width);
};
