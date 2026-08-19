import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Row, Col, Form, Badge, Button, Spinner, Card, InputGroup,
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

import { assetApi }    from '../api/assetApi';
import { queryKeys }   from '../api/queryKeys';
import { useDebounce }       from '../hooks/useDebounce';
import { useThrottledValue } from '../hooks/useThrottle';
import { useAuth }           from '../hooks/useAuth';
import { useDispatch, useSelector } from 'react-redux';
import { setAssetFilter, resetAssetFilters } from '../store/uiSlice';

import AssetCard   from '../components/AssetCard';
import AssetModal  from '../features/assets/AssetModal';
import AssignModal from '../features/assets/AssignModal';

import './AssetList.css';

const STATUS_VARIANT = {
  AVAILABLE: 'success', ASSIGNED: 'primary',
  MAINTENANCE: 'warning', RETIRED: 'secondary',
};

const PAGE_SIZE = 50;

/**
 * AssetList — browse, search, and manage the asset inventory.
 *
 * Responsibilities:
 *   - Card view and virtualized list view
 *   - Search + filter by status / type (stored in Redux ui slice)
 *   - Pagination
 *   - Admin actions: add, edit, delete, assign, unassign assets
 *
 * AssetModal and AssignModal are imported from features/assets/ — not defined here.
 */
export default function AssetList() {
  const { isAdmin } = useAuth();
  const qClient     = useQueryClient();
  const dispatch    = useDispatch();
  const filters     = useSelector(s => s.ui.assetFilters);

  const [searchInput, setSearchInput]   = useState('');
  const [page, setPage]                 = useState(0);
  const [viewMode, setViewMode]         = useState('card');
  const [showAdd, setShowAdd]           = useState(false);
  const [editAsset, setEditAsset]       = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);

  // Reset stale Redux filter state on first load
  useEffect(() => { dispatch(resetAssetFilters()); }, []);

  // Debounce keystrokes, then throttle network calls
  const debouncedSearch = useDebounce(searchInput, 300);
  const throttledSearch = useThrottledValue(debouncedSearch, 500);

  const queryParams = {
    search:  throttledSearch || undefined,
    status:  filters.status  || undefined,
    type:    filters.type    || undefined,
    page,
    size:    PAGE_SIZE,
    sortBy:  'name',
  };

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: queryKeys.assets.search(queryParams),
    queryFn:  () => assetApi.search(queryParams),
    staleTime: 2 * 60 * 1000,
    placeholderData: prev => prev,
  });

  const assets = data?.content || [];
  const total  = data?.totalElements || 0;

  // ── Error display helper ───────────────────────────────────────────────────
  const showApiError = (e) => {
    const d = e?.response?.data;
    if (d?.errors) toast.error(`Validation: ${Object.values(d.errors)[0]}`);
    else toast.error(d?.message || 'Request failed');
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: assetApi.create,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
      toast.success('Asset added!');
      setShowAdd(false);
    },
    onError: showApiError,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }) => assetApi.update(id, d),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
      toast.success('Updated!');
      setEditAsset(null);
    },
    onError: showApiError,
  });

  const deleteMutation = useMutation({
    mutationFn: assetApi.delete,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
      toast.success('Deleted');
    },
    onError: () => toast.error('Delete failed'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ assetId, userId }) => assetApi.assign(assetId, userId),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
      toast.success('Assigned!');
      setAssignTarget(null);
    },
    onError: () => toast.error('Assignment failed'),
  });

  const unassignMutation = useMutation({
    mutationFn: assetApi.unassign,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.assets.all() });
      toast.success('Unassigned');
    },
    onError: () => toast.error('Unassign failed'),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = useCallback((form) => {
    const payload = {
      ...form,
      purchasePrice: form.purchasePrice !== '' && form.purchasePrice != null
        ? parseFloat(form.purchasePrice) : null,
      branchId: form.branchId || null,
    };
    if (editAsset?.id) updateMutation.mutate({ id: editAsset.id, d: payload });
    else createMutation.mutate(payload);
  }, [editAsset, createMutation, updateMutation]);

  const handleDelete = useCallback((id) => {
    if (window.confirm('Delete this asset?')) deleteMutation.mutate(id);
  }, [deleteMutation]);

  const handleFilterChange = (key, value) => {
    dispatch(setAssetFilter({ [key]: value }));
    setPage(0);
  };

  const handleReset = () => {
    dispatch(resetAssetFilters());
    setSearchInput('');
    setPage(0);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Container fluid className="py-4 px-3">

      {/* Header row */}
      <Row className="mb-3 align-items-center">
        <Col>
          <h4 className="mb-0 fw-bold">
            🖥️ Asset Inventory
            <span className="text-muted fw-normal fs-6 ms-2">({total.toLocaleString()} total)</span>
            {isFetching && !isLoading && <Spinner size="sm" className="ms-2" />}
          </h4>
        </Col>
        <Col xs="auto" className="d-flex gap-2">
          <div className="btn-group btn-group-sm">
            <Button variant={viewMode === 'card' ? 'dark' : 'outline-dark'} onClick={() => setViewMode('card')}>⊞ Cards</Button>
            <Button variant={viewMode === 'list' ? 'dark' : 'outline-dark'} onClick={() => setViewMode('list')}>☰ List</Button>
          </div>
          <Link to="/requests/new" className="btn btn-outline-primary btn-sm">+ Request Asset</Link>
          {isAdmin && <Button variant="success" size="sm" onClick={() => setShowAdd(true)}>+ Add Asset</Button>}
        </Col>
      </Row>

      {/* Filters */}
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Body className="py-3">
          <Row className="g-2 align-items-center">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>🔍</InputGroup.Text>
                <Form.Control
                  placeholder="Search name or serial…"
                  value={searchInput}
                  onChange={e => { setSearchInput(e.target.value); setPage(0); }}
                />
                {searchInput && (
                  <Button variant="outline-secondary" onClick={() => { setSearchInput(''); setPage(0); }}>✕</Button>
                )}
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)}>
                <option value="">All Types</option>
                {['Laptop','Monitor','Desktop','Printer','Keyboard','Mouse','Tablet','Server','Network Equipment'].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Button variant="outline-secondary" size="sm" onClick={handleReset}>Reset</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-5">
          <Spinner variant="primary" />
          <div className="mt-2 text-muted">Loading…</div>
        </div>
      ) : isError ? (
        <div className="alert alert-danger">Failed to load assets.</div>
      ) : assets.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div className="empty-state-icon">📦</div>
          <div>No assets found.</div>
        </div>
      ) : viewMode === 'card' ? (
        <Row className="g-3">
          {assets.map(asset => (
            <Col key={asset.id} xs={12} sm={6} md={4} lg={3}>
              <AssetCard
                asset={asset}
                isAdmin={isAdmin}
                onAssign={asset.status === 'AVAILABLE' ? setAssignTarget : null}
                onEdit={isAdmin ? setEditAsset : null}
                onDelete={isAdmin ? handleDelete : null}
              />
            </Col>
          ))}
        </Row>
      ) : (
        /* Virtualized list — only visible rows are in the DOM */
        <Card className="border-0 shadow-sm overflow-hidden">
          <div role="row" className="list-header">
            <div className="list-col-asset">Asset</div>
            <div className="list-col-serial">Serial #</div>
            <div className="list-col-price">Price</div>
            <div className="list-col-status">Status</div>
            <div className="list-col-branch">Branch</div>
            {isAdmin && <div className="list-col-actions">Actions</div>}
          </div>

          <div style={{ height: Math.min(assets.length * 60, 540) }}>
            <AutoSizer>
              {({ width, height }) => (
                <FixedSizeList
                  width={width}
                  height={height}
                  itemCount={assets.length}
                  itemSize={60}
                  overscanCount={5}
                >
                  {({ index, style }) => {
                    const asset = assets[index];
                    return (
                      <div
                        key={asset.id}
                        style={style}
                        className={`list-row ${index % 2 === 0 ? 'list-row--even' : 'list-row--odd'}`}
                      >
                        <div className="list-col-asset">
                          <div className="fw-semibold">{asset.name}</div>
                          <small className="text-muted">{asset.manufacturer} · {asset.type}</small>
                        </div>
                        <div className="list-col-serial">
                          <small className="font-monospace text-muted">{asset.serialNumber}</small>
                        </div>
                        <div className="list-col-price">
                          <span className="fw-bold text-primary">
                            {asset.purchasePrice ? `$${Number(asset.purchasePrice).toLocaleString()}` : '—'}
                          </span>
                        </div>
                        <div className="list-col-status">
                          <Badge bg={STATUS_VARIANT[asset.status] || 'secondary'}>{asset.status}</Badge>
                        </div>
                        <div className="list-col-branch">
                          <small>{asset.branchName || '—'}</small>
                        </div>
                        {isAdmin && (
                          <div className="list-col-actions">
                            {asset.status === 'AVAILABLE' && (
                              <Button size="sm" variant="outline-primary" onClick={() => setAssignTarget(asset)}>Assign</Button>
                            )}
                            {asset.status === 'ASSIGNED' && (
                              <Button size="sm" variant="outline-warning" onClick={() => { if (window.confirm('Unassign?')) unassignMutation.mutate(asset.id); }}>Unassign</Button>
                            )}
                            <Button size="sm" variant="outline-secondary" onClick={() => setEditAsset(asset)}>Edit</Button>
                            <Button size="sm" variant="outline-danger"    onClick={() => handleDelete(asset.id)}>🗑</Button>
                          </div>
                        )}
                      </div>
                    );
                  }}
                </FixedSizeList>
              )}
            </AutoSizer>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {data?.totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-3">
          <small className="text-muted">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
          </small>
          <div className="d-flex gap-2">
            <Button size="sm" variant="outline-secondary" disabled={data.first} onClick={() => setPage(p => p - 1)}>← Prev</Button>
            <span className="px-2 py-1 text-muted small">Page {page + 1}/{data.totalPages}</span>
            <Button size="sm" variant="outline-secondary" disabled={data.last}  onClick={() => setPage(p => p + 1)}>Next →</Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <AssetModal
        show={showAdd || !!editAsset}
        onHide={() => { setShowAdd(false); setEditAsset(null); }}
        initial={editAsset}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
      />

      <AssignModal
        show={!!assignTarget}
        asset={assignTarget}
        onHide={() => setAssignTarget(null)}
        onAssign={(aid, uid) => assignMutation.mutate({ assetId: aid, userId: uid })}
        assigning={assignMutation.isPending}
      />
    </Container>
  );
}
