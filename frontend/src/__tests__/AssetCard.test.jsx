/**
 * Jest-compatible component tests for AssetCard (run via Vitest).
 *
 * Covers:
 *  - Renders asset name and serial number
 *  - Renders status badge label
 *  - Renders purchase price with aria-label
 *  - Admin actions: Assign / Edit / Delete buttons render when isAdmin=true
 *  - Assign button hidden when asset is not AVAILABLE
 *  - onAssign / onEdit / onDelete callbacks fire with correct arguments
 *  - WCAG: article has accessible label, action buttons have aria-label
 *  - Icon banner is aria-hidden (decorative)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssetCard from '../components/AssetCard';

const baseAsset = {
  id: 1,
  name: 'HP EliteBook 840',
  type: 'Laptop',
  serialNumber: 'HP-LAP-001',
  status: 'AVAILABLE',
  manufacturer: 'HP',
  model: '840 G10',
  branchName: 'HQ New York',
  purchasePrice: 1299.99,
  warrantyExpiry: '2027-06-01',
};

function renderCard(props = {}) {
  return render(
    <AssetCard
      asset={baseAsset}
      isAdmin={false}
      onAssign={null}
      onEdit={null}
      onDelete={null}
      {...props}
    />
  );
}

describe('AssetCard — rendering', () => {
  it('renders the asset name', () => {
    renderCard();
    expect(screen.getByText('HP EliteBook 840')).toBeInTheDocument();
  });

  it('renders the serial number', () => {
    renderCard();
    expect(screen.getByText(/HP-LAP-001/)).toBeInTheDocument();
  });

  it('renders status badge label', () => {
    renderCard();
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('renders purchase price', () => {
    renderCard();
    // formatted as $1,299.99
    expect(screen.getByText(/1,299\.99/)).toBeInTheDocument();
  });

  it('renders branch name', () => {
    renderCard();
    expect(screen.getByText(/HQ New York/)).toBeInTheDocument();
  });

  it('truncates long description at 80 chars', () => {
    const longDesc = 'A'.repeat(90);
    renderCard({ asset: { ...baseAsset, description: longDesc } });
    expect(screen.getByText(/A{80}…/)).toBeInTheDocument();
  });
});

describe('AssetCard — WCAG accessibility', () => {
  it('article has aria-label containing name and status', () => {
    renderCard();
    const article = screen.getByRole('article');
    expect(article).toHaveAttribute('aria-label', 'HP EliteBook 840, Available');
  });

  it('icon banner is aria-hidden (decorative)', () => {
    renderCard();
    // The div wrapping the emoji icon should have aria-hidden="true"
    const hiddenDivs = document.querySelectorAll('[aria-hidden="true"]');
    expect(hiddenDivs.length).toBeGreaterThan(0);
  });

  it('purchase price element has descriptive aria-label', () => {
    renderCard();
    const priceEl = screen.getByLabelText(/Purchase price/i);
    expect(priceEl).toBeInTheDocument();
  });
});

describe('AssetCard — admin actions', () => {
  it('does not show action buttons when isAdmin=false', () => {
    renderCard({ isAdmin: false });
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Assign, Edit, Delete buttons when isAdmin=true and asset is AVAILABLE', () => {
    renderCard({
      isAdmin: true,
      onAssign: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(screen.getByRole('button', { name: /assign HP EliteBook 840/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit HP EliteBook 840/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete HP EliteBook 840/i })).toBeInTheDocument();
  });

  it('hides Assign button when asset status is not AVAILABLE', () => {
    renderCard({
      isAdmin: true,
      asset: { ...baseAsset, status: 'ASSIGNED' },
      onAssign: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
  });

  it('calls onAssign with the asset object when Assign is clicked', () => {
    const onAssign = vi.fn();
    renderCard({ isAdmin: true, onAssign, onEdit: vi.fn(), onDelete: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: /assign HP EliteBook 840/i }));
    expect(onAssign).toHaveBeenCalledWith(baseAsset);
    expect(onAssign).toHaveBeenCalledTimes(1);
  });

  it('calls onEdit with the asset object when Edit is clicked', () => {
    const onEdit = vi.fn();
    renderCard({ isAdmin: true, onAssign: vi.fn(), onEdit, onDelete: vi.fn() });
    fireEvent.click(screen.getByRole('button', { name: /edit HP EliteBook 840/i }));
    expect(onEdit).toHaveBeenCalledWith(baseAsset);
  });

  it('calls onDelete with asset id when Delete is clicked', () => {
    const onDelete = vi.fn();
    renderCard({ isAdmin: true, onAssign: vi.fn(), onEdit: vi.fn(), onDelete });
    fireEvent.click(screen.getByRole('button', { name: /delete HP EliteBook 840/i }));
    expect(onDelete).toHaveBeenCalledWith(1);
  });
});
