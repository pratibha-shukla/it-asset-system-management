import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Card, Table, Badge, Button, Spinner,
  Modal, Form, Row, Col
} from 'react-bootstrap';
import { toast } from 'react-toastify';
import { adminApi } from '../api/adminApi';
import FormField from '../components/FormField';
import './BranchManagement.css';

const EMPTY_BRANCH = { name:'', location:'', city:'', country:'', contactEmail:'' };

const EMAIL_REGEX  = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX   = /^[a-zA-Z0-9\s\-&.,()]{2,80}$/;
const CITY_REGEX   = /^[a-zA-Z\s\-'.]{2,50}$/;

function validateBranch(form) {
  const e = {};
  if (!form.name?.trim())          e.name = 'Branch name is required';
  else if (!NAME_REGEX.test(form.name)) e.name = 'Letters, numbers, spaces and - & . , ( ) only';
  if (form.city && !CITY_REGEX.test(form.city))         e.city = 'Letters, spaces, hyphens only';
  if (form.contactEmail && !EMAIL_REGEX.test(form.contactEmail)) e.contactEmail = 'Enter a valid email';
  return e;
}

function BranchModal({ show, onHide, initial, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_BRANCH);
  const [errs, setErrs] = useState({});
  const set = (k, v) => { setForm(f=>({...f,[k]:v})); setErrs(e=>({...e,[k]:undefined})); };
  useEffect(() => {
    setForm(initial ? {...EMPTY_BRANCH,...initial} : EMPTY_BRANCH);
    setErrs({});
  }, [initial, show]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validateBranch(form);
    if (Object.keys(v).length) { setErrs(v); return; }
    onSave(form);
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>🏢 {initial?.id ? 'Edit Branch' : 'Add New Branch'}</Modal.Title>
      </Modal.Header>
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <Row className="g-3">
            <Col md={12}>
              <FormField k="name" label="Branch Name" required errs={errs}>
                <Form.Control value={form.name} isInvalid={!!errs.name} isValid={!errs.name && form.name.length>=2}
                  onChange={e=>set('name',e.target.value)} placeholder="Headquarters"/>
              </FormField>
            </Col>
            <Col md={6}>
              <FormField k="city" label="City" errs={errs}>
                <Form.Control value={form.city} isInvalid={!!errs.city}
                  onChange={e=>set('city',e.target.value)} placeholder="New York"/>
              </FormField>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-semibold">Country</Form.Label>
                <Form.Control value={form.country} onChange={e=>set('country',e.target.value)} placeholder="USA"/>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label className="fw-semibold">Address / Location</Form.Label>
                <Form.Control value={form.location} onChange={e=>set('location',e.target.value)}
                  placeholder="123 Main Street, Suite 400"/>
              </Form.Group>
            </Col>
            <Col md={12}>
              <FormField k="contactEmail" label="Contact Email" errs={errs}>
                <Form.Control type="email" value={form.contactEmail} isInvalid={!!errs.contactEmail}
                  onChange={e=>set('contactEmail',e.target.value)} placeholder="hq@company.com"/>
              </FormField>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? <Spinner size="sm" className="me-1"/> : null}
            {initial?.id ? 'Save Changes' : 'Add Branch'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

export default function BranchManagement() {
  const qClient  = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editBranch, setEditBranch] = useState(null);

  const { data: branchData, isLoading, isError } = useQuery({
    queryKey: ['branches'],
    queryFn:  adminApi.getBranches,
    staleTime: 60_000,
  });
  const branches = Array.isArray(branchData) ? branchData : branchData?.content || [];

  // Fetch user count per branch (from admin/users endpoint)
  const { data: usersData } = useQuery({
    queryKey: ['admin','users',{size:200}],
    queryFn: () => adminApi.getUsers({size:200}),
    staleTime: 60_000,
  });
  const branchUserCount = useMemo(() => {
    const map = {};
    (usersData?.content||[]).forEach(u => {
      if (u.branchId) map[u.branchId] = (map[u.branchId]||0) + 1;
    });
    return map;
  }, [usersData]);

  const invalidate = () => qClient.invalidateQueries({queryKey:['branches']});

  const createMutation = useMutation({
    mutationFn: (data) => adminApi.createBranch(data),
    onSuccess: () => { invalidate(); toast.success('✅ Branch created!'); setShowModal(false); },
    onError: (e) => {
      const d = e?.response?.data;
      if (d?.errors) toast.error(`Validation: ${Object.values(d.errors)[0]}`);
      else toast.error(d?.message || 'Failed to create branch');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({id, data}) => adminApi.updateBranch(id, data),
    onSuccess: () => { invalidate(); toast.success('Branch updated!'); setShowModal(false); setEditBranch(null); },
    onError: () => toast.error('Failed to update branch'),
  });

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSave = (form) => {
    if (editBranch?.id) updateMutation.mutate({id: editBranch.id, data: form});
    else createMutation.mutate(form);
  };

  const openEdit = (branch) => { setEditBranch(branch); setShowModal(true); };
  const openAdd  = () => { setEditBranch(null); setShowModal(true); };

  return (
    <Container fluid className="py-4 px-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-0">🏢 Branch Management</h4>
          <small className="text-muted">{branches.length} branches</small>
        </div>
        <Button variant="primary" onClick={openAdd}>+ Add Branch</Button>
      </div>

      {/* Branch cards */}
      {isLoading ? (
        <div className="text-center py-5"><Spinner variant="primary"/></div>
      ) : isError ? (
        <div className="alert alert-danger">Failed to load branches.</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-5 text-muted">
          <div className="empty-icon">🏢</div>
          <div>No branches found.</div>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <Row className="g-3 mb-4">
            {branches.map(b => (
              <Col key={b.id} md={4}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h6 className="fw-bold mb-1">{b.name}</h6>
                        <Badge bg="info" className="me-1">{b.city || '—'}</Badge>
                        <Badge bg="secondary">{b.country || '—'}</Badge>
                      </div>
                      <Button size="sm" variant="outline-secondary" onClick={()=>openEdit(b)}>✏️ Edit</Button>
                    </div>
                    <div className="small text-muted mb-1">📍 {b.location || 'No address set'}</div>
                    <div className="small text-muted mb-2">✉️ {b.contactEmail || 'No email set'}</div>
                    <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top">
                      <span className="fw-bold text-primary branch-count">
                        {branchUserCount[b.id] || 0}
                      </span>
                      <span className="text-muted small">employees</span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Detail table */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold py-3">All Branches — Details</Card.Header>
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Branch Name</th>
                    <th>City</th>
                    <th>Country</th>
                    <th>Address</th>
                    <th>Contact Email</th>
                    <th>Employees</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td><small className="text-muted">#{b.id}</small></td>
                      <td><span className="fw-semibold">{b.name}</span></td>
                      <td>{b.city || '—'}</td>
                      <td>{b.country || '—'}</td>
                      <td><small className="text-muted">{b.location || '—'}</small></td>
                      <td><small>{b.contactEmail || '—'}</small></td>
                      <td>
                        <Badge bg="primary">{branchUserCount[b.id] || 0} users</Badge>
                      </td>
                      <td>
                        <Button size="sm" variant="outline-secondary" onClick={()=>openEdit(b)}>Edit</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}

      <BranchModal
        show={showModal}
        onHide={() => { setShowModal(false); setEditBranch(null); }}
        initial={editBranch}
        onSave={handleSave}
        saving={saving}
      />
    </Container>
  );
}
