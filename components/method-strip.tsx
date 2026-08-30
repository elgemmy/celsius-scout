export function MethodStrip({
  isObserved,
  snapshotId,
}: {
  isObserved: boolean;
  snapshotId?: string;
}) {
  return (
    <section className="method-strip"><p><strong>Data honesty:</strong> {isObserved ? `this view uses a captured FortyGuard historical TCM snapshot (${snapshotId}); switch to Demo for the labeled synthetic fallback.` : "this view uses the labeled synthetic Phoenix fallback; switch to Snapshot for the captured FortyGuard data."} Ratings are recomputed from the active cohort.</p><p><strong>Interpretation:</strong> Heat Pressure is 50% Peak plus 50% Stamina. Surprise compares the nearest sampled cohort tiles; it is not statistical significance. These are comparison tools—not health, safety, or causal claims.</p></section>
  );
}
