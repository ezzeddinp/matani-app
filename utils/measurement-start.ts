type Job = { status?: string | null; updated_at?: string | null } | null;

// One launch per detail-screen visit; backend idempotency owns cross-device deduplication.
export function shouldStartMeasurement(
  observationCount: number,
  job: Job,
  now = Date.now(),
): boolean {
  if (observationCount > 0 || job?.status === 'succeeded') return false;
  if (job?.status === 'processing') {
    const updatedAt = Date.parse(job.updated_at ?? '');
    return Number.isFinite(updatedAt) && now - updatedAt > 10 * 60_000;
  }
  return true;
}
