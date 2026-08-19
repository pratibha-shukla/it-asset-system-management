// Reusable AssetCard — WCAG 2.1 AA compliant
import React from 'react';
import './AssetCard.css';

const TYPE_ICONS = {
  Laptop:             '💻',
  Monitor:            '🖥️',
  Desktop:            '🖥️',
  Printer:            '🖨️',
  Keyboard:           '⌨️',
  Mouse:              '🖱️',
  'Network Equipment':'🌐',
  Tablet:             '📱',
  Server:             '🗄️',
};

const TYPE_COLORS = {
  Laptop:             '#dbeafe',
  Monitor:            '#ede9fe',
  Desktop:            '#e0f2fe',
  Printer:            '#fef9c3',
  Keyboard:           '#dcfce7',
  Mouse:              '#fce7f3',
  'Network Equipment':'#ffedd5',
  Tablet:             '#f0fdf4',
  Server:             '#f1f5f9',
};

const STATUS_COLORS = {
  AVAILABLE:   { bg: '#d1fae5', color: '#065f46', label: 'Available'   },
  ASSIGNED:    { bg: '#dbeafe', color: '#1e40af', label: 'Assigned'    },
  MAINTENANCE: { bg: '#fef3c7', color: '#92400e', label: 'Maintenance' },
  RETIRED:     { bg: '#fee2e2', color: '#991b1b', label: 'Retired'     },
};

// React.memo — prevents re-render if props didn't change.
// AssetList renders many cards; without memo every filter/search keystroke
// re-renders ALL cards even though only the filtered list changed.
const AssetCard = React.memo(function AssetCard({ asset, onAssign, onEdit, onDelete, isAdmin }) {
  const icon  = TYPE_ICONS[asset.type]  || '📦';
  const bgClr = TYPE_COLORS[asset.type] || '#f1f5f9';
  const badge = STATUS_COLORS[asset.status] || STATUS_COLORS['AVAILABLE'];

  return (
    /*
     * WCAG 1.3.1: article landmark — each card is a self-contained content item.
     * aria-label gives the card a meaningful name for screen readers.
     */
    <article
      aria-label={`${asset.name}, ${badge.label}`}
      className="asset-card"
    >
      {/* Icon banner — aria-hidden: decorative, asset name in the heading carries the meaning */}
      <div
        aria-hidden="true"
        className="asset-card__banner"
        style={{ background: bgClr }}
      >
        <span className="asset-card__icon">{icon}</span>
        {/* Status badge — visible text already present, not colour-only */}
        <span
          className="asset-card__status-badge"
          style={{ background: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
        <span className="asset-card__type-badge">{asset.type}</span>
      </div>

      {/* Body */}
      <div className="asset-card__body">
        {/* WCAG 1.3.1: h3 inside article — not h6, preserves heading hierarchy */}
        <h3 className="asset-card__name">{asset.name}</h3>
        <p className="asset-card__subtitle">{asset.manufacturer} · {asset.model}</p>
        {asset.description && (
          <p className="asset-card__description">
            {asset.description.slice(0, 80)}{asset.description.length > 80 && '…'}
          </p>
        )}

        {/* Price — aria-label provides context beyond visual "$" symbol */}
        {asset.purchasePrice && (
          <div
            aria-label={`Purchase price: $${Number(asset.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
            className="asset-card__price"
          >
            ${Number(asset.purchasePrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        )}

        {/* Details — aria-hidden on decorative emojis, <dl> for key-value semantics */}
        <dl className="asset-card__details">
          <div><dt className="sr-only">Branch</dt><dd><span aria-hidden="true">📍 </span>{asset.branchName || '—'}</dd></div>
          <div><dt className="sr-only">Serial number</dt><dd><span aria-hidden="true">🔢 </span>{asset.serialNumber}</dd></div>
          {asset.warrantyExpiry && (
            <div><dt className="sr-only">Warranty expiry</dt><dd><span aria-hidden="true">🛡️ </span>Warranty: {asset.warrantyExpiry}</dd></div>
          )}
          {asset.assignedToName && (
            <div><dt className="sr-only">Assigned to</dt><dd><span aria-hidden="true">👤 </span>{asset.assignedToName}</dd></div>
          )}
        </dl>
      </div>

      {/* Actions */}
      {isAdmin && (
        <div className="asset-card__actions">
          {asset.status === 'AVAILABLE' && onAssign && (
            <button
              onClick={() => onAssign(asset)}
              aria-label={`Assign ${asset.name}`}
              className="asset-card__btn-assign"
            >
              Assign
            </button>
          )}
          {onEdit && (
            <button
              onClick={() => onEdit(asset)}
              aria-label={`Edit ${asset.name}`}
              className="asset-card__btn-edit"
            >
              Edit
            </button>
          )}
          {onDelete && (
            /* WCAG 4.1.2: icon-only button must have accessible name */
            <button
              onClick={() => onDelete(asset.id)}
              aria-label={`Delete ${asset.name}`}
              className="asset-card__btn-delete"
            >
              <span aria-hidden="true">🗑</span>
            </button>
          )}
        </div>
      )}
    </article>
  );
});

export default AssetCard;
