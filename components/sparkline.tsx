export function Sparkline({ values, accent }: { values: number[]; accent: string }) {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;
  const step = 288 / Math.max(1, values.length - 1);
  const points = values.map((value, index) => `${index * step},${64 - ((value - minimum) / range) * 52}`).join(" ");
  const area = `0,70 ${points} ${(values.length - 1) * step},70`;
  const gradientId = `spark-fill-${accent.slice(1)}`;
  return (
    <svg className="sparkline" viewBox="0 0 288 72" role="img" aria-label={`Temperature series with a ${maximum.toFixed(1)} degree Celsius peak`}>
      <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={accent} stopOpacity=".46" /><stop offset="1" stopColor={accent} stopOpacity="0" /></linearGradient></defs>
      <path d="M0 52H288M0 26H288" className="spark-grid" />
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={values.indexOf(maximum) * step} cy="12" r="4.5" fill={accent} stroke="#102126" strokeWidth="3" />
    </svg>
  );
}
