export type NdviClassificationKey = 'darkGreen' | 'yellowGreen' | 'orange' | 'red' | 'unknown';

export type NdviClassification = {
  key: NdviClassificationKey;
  title: string;
  description: string;
  color: string;
  background?: string;
  range: string;
};

export const NDVI_SEVERITY_CONFIG: NdviClassification[] = [
  {
    key: 'darkGreen',
    title: 'Kehijauan Tinggi',
    description: 'Rentang interpretasi prototipe; bukan diagnosis kesehatan tanaman.',
    color: '#1B5E20',
    background: 'rgba(27, 94, 32, 0.18)',
    range: '0.60 – 1.00',
  },
  {
    key: 'yellowGreen',
    title: 'Kehijauan Sedang',
    description: 'Rentang interpretasi prototipe yang masih memerlukan verifikasi lapangan.',
    color: '#F9A825',
    background: 'rgba(249, 168, 37, 0.18)',
    range: '0.20 – 0.59',
  },
  {
    key: 'orange',
    title: 'Kehijauan Rendah',
    description: 'Dapat dipengaruhi fase tumbuh, tanah, air, atau tutupan rendah.',
    color: '#FB8C00',
    background: 'rgba(251, 140, 0, 0.18)',
    range: '0.00 – 0.19',
  },
  {
    key: 'red',
    title: 'NDVI Negatif',
    description: 'Dapat menunjukkan air, tanah, atau permukaan nonvegetasi.',
    color: '#D32F2F',
    background: 'rgba(211, 47, 47, 0.18)',
    range: '-1.00 – -0.01',
  },
];

export const NDVI_UNKNOWN_CONFIG: NdviClassification = {
  key: 'unknown',
  title: 'Data Tidak Tersedia',
  description: 'Belum ada nilai NDVI dengan provenance pengukuran yang lengkap.',
  color: '#546E7A',
  background: 'rgba(84, 110, 122, 0.14)',
  range: '–',
};

const NDVI_SEVERITY_BY_KEY = NDVI_SEVERITY_CONFIG.reduce(
  (acc, item) => {
    acc[item.key as Exclude<NdviClassificationKey, 'unknown'>] = item;
    return acc;
  },
  {} as Record<Exclude<NdviClassificationKey, 'unknown'>, NdviClassification>
);

export const classifyNdviStatus = (
  ndviScore: number | null | undefined,
  rawStatus: string | null | undefined
): NdviClassification => {
  if (typeof ndviScore === 'number' && Number.isFinite(ndviScore)) {
    if (ndviScore >= 0.6) {
      return NDVI_SEVERITY_BY_KEY.darkGreen;
    }
    if (ndviScore >= 0.2) {
      return NDVI_SEVERITY_BY_KEY.yellowGreen;
    }
    if (ndviScore >= 0) {
      return NDVI_SEVERITY_BY_KEY.orange;
    }
    if (ndviScore >= -1) {
      return NDVI_SEVERITY_BY_KEY.red;
    }
  }

  if (rawStatus) {
    const normalised = rawStatus.trim().toLowerCase();
    if (['healthy', 'baik', 'normal', 'high'].includes(normalised)) {
      return NDVI_SEVERITY_BY_KEY.darkGreen;
    }
    if (['warning', 'moderate', 'perlu perhatian', 'medium'].includes(normalised)) {
      return NDVI_SEVERITY_BY_KEY.yellowGreen;
    }
    if (['low', 'rendah', 'stressed'].includes(normalised)) {
      return NDVI_SEVERITY_BY_KEY.orange;
    }
    if (['danger', 'buruk', 'needs_attention', 'critical', 'very_low'].includes(normalised)) {
      return NDVI_SEVERITY_BY_KEY.red;
    }
  }

  return NDVI_UNKNOWN_CONFIG;
};

export const formatNdviValue = (value: number | null | undefined, fractionDigits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '--';
  }
  return value.toFixed(fractionDigits);
};
