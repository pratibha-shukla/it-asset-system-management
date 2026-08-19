import { Card } from 'react-bootstrap';
import './StatCard.css';

/**
 * StatCard — reusable dashboard statistics tile.
 *
 * Props:
 *   label   - display label (e.g. "Total Assets")
 *   value   - numeric value to display; shows "—" while undefined/null
 *   icon    - emoji or node shown on the right (decorative, aria-hidden)
 *   variant - Bootstrap color variant (default: 'primary')
 *             controls the top border and value text color
 */
function StatCard({ label, value, icon, variant = 'primary' }) {
  const labelId = `stat-${label.replace(/\s/g, '-').toLowerCase()}`;

  return (
    <Card
      className={`stat-card border-0 shadow-sm border-top border-${variant} border-3`}
      aria-label={`${label}: ${value ?? 'loading'}`}
    >
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="text-muted small" id={labelId}>{label}</div>
            <div
              className={`fs-2 fw-bold text-${variant}`}
              aria-describedby={labelId}
            >
              {value ?? '—'}
            </div>
          </div>
          <span aria-hidden="true" className="stat-card__icon">{icon}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

export default StatCard;
