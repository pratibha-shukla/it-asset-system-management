import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Card, Table, Badge, Button, Spinner, Form, InputGroup,
} from 'react-bootstrap';
import { toast } from 'react-toastify';

import { adminApi }    from '../api/adminApi';
import { authApi }     from '../api/authApi';
import { useDebounce } from '../hooks/useDebounce';
import { usePageTitle } from '../hooks/usePageTitle';
import { maskPhoneNumber } from '../utils/mask';

import AddUserModal  from '../features/users/AddUserModal';
import EditUserModal from '../features/users/EditUserModal';

import './UserManagement.css';

const ROLE_VARIANT = { ADMIN: 'danger', MANAGER: 'warning', EMPLOYEE: 'primary' };

/**
 * UserManagement — admin page to view, add, edit, and deactivate users.
 *
 * Responsibilities:
 *   - Search / paginate the user list
 *   - Open AddUserModal for creating new users
 *   - Open EditUserModal for updating profile / role / password
 *   - Deactivate users
 *
 * All modals are imported from features/users/ — not defined here.
 */
export default function UserManagement() {
  const qClient = useQueryClient();
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [showAdd, setShowAdd]   = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [revealedPhones, setRevealedPhones] = useState(() => new Set());

  const debouncedSearch = useDebounce(search, 300);
  usePageTitle('User Management');

  const togglePhoneReveal = (id) => setRevealedPhones((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: branchData } = useQuery({
    queryKey: ['branches'],
    queryFn:  adminApi.getBranches,
    staleTime: 5 * 60 * 1000,
  });
  const branches = Array.isArray(branchData) ? branchData : branchData?.content || [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'users', { search: debouncedSearch, page }],
    queryFn:  () => adminApi.getUsers({ search: debouncedSearch || undefined, page, size: 20 }),
    staleTime: 30_000,
    placeholderData: prev => prev,
  });
  const users = data?.content || [];
  const total = data?.totalElements || 0;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('✅ User added successfully!');
      setShowAdd(false);
    },
    onError: (e) => {
      const d = e?.response?.data;
      if (d?.errors) toast.error(`Validation: ${Object.values(d.errors)[0]}`);
      else toast.error(d?.message || 'Failed to add user');
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('✅ User updated!');
      setEditUser(null);
    },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to update user'),
  });

  const resetPwdMutation = useMutation({
    mutationFn: ({ id, password }) => adminApi.resetPassword(id, password),
    onSuccess: () => { toast.success('✅ Password reset!'); setEditUser(null); },
    onError: (e) => toast.error(e?.response?.data?.message || 'Failed to reset password'),
  });

  const deactivateMutation = useMutation({
    mutationFn: adminApi.deactivateUser,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deactivated');
    },
    onError: () => toast.error('Failed to deactivate user'),
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Container fluid as="main" id="main-content" className="py-4 px-4">

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0 fs-4">
            <span aria-hidden="true">👥 </span>User Management
          </h1>
          <small className="text-muted" aria-live="polite" aria-atomic="true">
            {total} user{total !== 1 ? 's' : ''} registered
          </small>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)} aria-haspopup="dialog">
          + Add New User
        </Button>
      </div>

      {/* Search bar */}
      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="py-3">
          <Form.Label htmlFor="user-search" className="sr-only">
            Search users by name or email
          </Form.Label>
          <InputGroup className="search-group">
            <InputGroup.Text aria-hidden="true">🔍</InputGroup.Text>
            <Form.Control
              id="user-search"
              placeholder="Search by name or email…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              aria-label="Search users by name or email"
            />
            {search && (
              <Button variant="outline-secondary" onClick={() => { setSearch(''); setPage(0); }} aria-label="Clear search">
                ✕
              </Button>
            )}
          </InputGroup>
        </Card.Body>
      </Card>

      {/* Users table */}
      <Card className="border-0 shadow-sm">
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center py-5" role="status">
              <Spinner variant="primary" />
              <div className="mt-2 text-muted">Loading users…</div>
            </div>
          ) : isError ? (
            <div className="alert alert-danger m-3" role="alert">Failed to load users.</div>
          ) : users.length === 0 ? (
            <div className="text-center py-5 text-muted" role="status">
              <span className="empty-icon">👤</span>
              <p>No users found.</p>
            </div>
          ) : (
            <Table hover responsive className="mb-0" aria-label="Registered users">
              <thead className="table-dark">
                <tr>
                  <th>ID</th><th>Name</th><th>Email</th><th>Role</th>
                  <th>Branch</th><th>Phone</th><th>Employee ID</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td><small className="text-muted">#{u.id}</small></td>
                    <td>
                      <div className="fw-semibold">{u.name}</div>
                      <small className="text-muted">{u.employeeId || '—'}</small>
                    </td>
                    <td><small>{u.email}</small></td>
                    <td>
                      <Badge bg={ROLE_VARIANT[u.role] || 'secondary'}>
                        {u.role?.replace('ROLE_', '')}
                      </Badge>
                    </td>
                    <td>
                      {u.branchName ? (
                        <div>
                          <div className="fw-semibold small">{u.branchName}</div>
                          <small className="text-muted">
                            {u.branchCity}{u.branchCountry ? `, ${u.branchCountry}` : ''}
                          </small>
                        </div>
                      ) : <span className="text-muted small">—</span>}
                    </td>
                    <td>
                      <small>
                        {u.phoneNumber
                          ? (revealedPhones.has(u.id) ? u.phoneNumber : maskPhoneNumber(u.phoneNumber))
                          : '—'}
                      </small>
                      {u.phoneNumber && (
                        <Button
                          variant="link" size="sm" className="p-0 ms-2"
                          onClick={() => togglePhoneReveal(u.id)}
                          aria-pressed={revealedPhones.has(u.id)}
                          aria-label={`${revealedPhones.has(u.id) ? 'Hide' : 'Show'} phone for ${u.name}`}
                        >
                          <span aria-hidden="true">{revealedPhones.has(u.id) ? '🙈' : '👁️'}</span>
                        </Button>
                      )}
                    </td>
                    <td><small className="font-monospace">{u.employeeId || '—'}</small></td>
                    <td>
                      <Badge bg={u.active ? 'success' : 'secondary'}>
                        {u.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-2">
                        <Button size="sm" variant="outline-secondary" onClick={() => setEditUser(u)} aria-label={`Edit ${u.name}`}>
                          ✏️ Edit
                        </Button>
                        {u.active && (
                          <Button
                            size="sm" variant="outline-danger"
                            disabled={deactivateMutation.isPending}
                            aria-label={`Deactivate ${u.name}`}
                            onClick={() => {
                              if (window.confirm(`Deactivate ${u.name}?`))
                                deactivateMutation.mutate(u.id);
                            }}
                          >
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>

        {/* Pagination */}
        {data?.totalPages > 1 && (
          <Card.Footer className="d-flex justify-content-between align-items-center bg-white">
            <small className="text-muted">
              {page * 20 + 1}–{Math.min((page + 1) * 20, total)} of {total}
            </small>
            <div className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={data.first} onClick={() => setPage(p => p - 1)}>← Prev</Button>
              <span className="px-2 py-1 small text-muted">Page {page + 1}/{data.totalPages}</span>
              <Button size="sm" variant="outline-secondary" disabled={data.last}  onClick={() => setPage(p => p + 1)}>Next →</Button>
            </div>
          </Card.Footer>
        )}
      </Card>

      {/* Modals */}
      <AddUserModal
        show={showAdd}
        onHide={() => setShowAdd(false)}
        onSave={(data) => addMutation.mutate(data)}
        saving={addMutation.isPending}
        branches={branches}
      />

      <EditUserModal
        show={!!editUser}
        onHide={() => setEditUser(null)}
        onSave={(data) => editMutation.mutate({ id: editUser.id, data })}
        onResetPassword={(id, password) => resetPwdMutation.mutate({ id, password })}
        saving={editMutation.isPending || resetPwdMutation.isPending}
        branches={branches}
        user={editUser}
      />
    </Container>
  );
}
