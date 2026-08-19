import './LoadingSkeleton.css';

export default function LoadingSkeleton() {
  return (
    <div
      className="container mt-4"
      role="status"
      aria-label="Loading content, please wait"
    >
      <span className="visually-hidden">Loading…</span>
      <div className="placeholder-glow" aria-hidden="true">
        <div className="placeholder col-6 mb-3 skeleton-title" />
        <div className="placeholder col-12 mb-2 skeleton-header" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="placeholder col-12 mb-2 skeleton-row" />
        ))}
      </div>
    </div>
  );
}
