const finiteOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const summarizeIndexBands = (bands, { includeCloudBand = false } = {}) => {
  if (!bands || typeof bands.length !== "number" || bands.length < 3) {
    throw new Error("process-raster-bands-missing");
  }
  const [values, validMask, sourceMask, cloudMask] = bands;
  if (
    values.length !== validMask.length ||
    values.length !== sourceMask.length ||
    (includeCloudBand && (!cloudMask || values.length !== cloudMask.length))
  ) {
    throw new Error("process-raster-band-size-mismatch");
  }

  let sourcePixelCount = 0;
  let cloudPixelCount = 0;
  const validValues = [];
  for (let index = 0; index < values.length; index += 1) {
    if (Number(sourceMask[index]) > 0.5) {
      sourcePixelCount += 1;
      if (includeCloudBand && Number(cloudMask[index]) > 0.5) {
        cloudPixelCount += 1;
      }
    }
    const value = finiteOrNull(values[index]);
    if (Number(validMask[index]) > 0.5 && value !== null) {
      validValues.push(value);
    }
  }

  const validPixelCount = validValues.length;
  const mean = validPixelCount
    ? validValues.reduce((sum, value) => sum + value, 0) / validPixelCount
    : null;
  const standardDeviation = validPixelCount
    ? Math.sqrt(
        validValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
          validPixelCount,
      )
    : null;

  return {
    sourcePixelCount,
    validPixelCount,
    validPixelFraction: sourcePixelCount ? validPixelCount / sourcePixelCount : 0,
    sampleCount: validPixelCount,
    minimum: validPixelCount ? Math.min(...validValues) : null,
    maximum: validPixelCount ? Math.max(...validValues) : null,
    mean,
    standardDeviation,
    cloudShadowFraction:
      includeCloudBand && sourcePixelCount ? cloudPixelCount / sourcePixelCount : null,
  };
};

export const decideQuality = ({ ndvi, ndmi, ndviFloor = 9, ndmiFloor = 3 }) => {
  if (!ndvi.sourcePixelCount || !ndmi.sourcePixelCount) {
    return { status: "rejected", reason: "no-valid-pixels" };
  }
  if (ndvi.validPixelCount < ndviFloor || ndmi.validPixelCount < ndmiFloor) {
    return { status: "rejected", reason: "too-few-valid-pixels" };
  }
  return { status: "passed", reason: null };
};
