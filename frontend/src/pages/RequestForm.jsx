import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Container, Card, Form, Button, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { requestApi } from '../api/requestApi';
import { assetApi }   from '../api/assetApi';
import { queryKeys }  from '../api/queryKeys';
import { useAuth }    from '../hooks/useAuth';
import './RequestForm.css';

import {
  isValidName, isValidProductName, isValidJustification,
  isValidPhone, isValidProjectName, VALIDATION_MESSAGES as VM
} from '../utils/validators';

const schema = yup.object({
  employeeName: yup
    .string()
    .required('Employee name is required')
    .test('name-regex', VM.name, isValidName),
  productName: yup
    .string()
    .required('Product name is required')
    .test('product-regex', VM.productName, isValidProductName),
  justification: yup
    .string()
    .required('Justification is required')
    .min(10, 'At least 10 characters required')
    .max(1000, 'Maximum 1000 characters')
    .test('just-regex', VM.justification, isValidJustification),
  priority:   yup.string().oneOf(['LOW','MEDIUM','HIGH']).required(),
  department: yup.string().required('Department is required'),
  projectName: yup.string().optional()
    .test('project-regex', VM.projectName, isValidProjectName),
  phoneNumber: yup.string().optional()
    .test('phone-regex', VM.phone, isValidPhone),
  quantity: yup
    .number()
    .typeError('Quantity must be a number')
    .min(1, 'Minimum 1')
    .max(50, 'Maximum 50')
    .required('Quantity is required'),
  neededBy: yup.string().optional(),
  assetId:  yup.number().nullable().transform(v => v === '' ? null : v),
});

const PRIORITY_COLORS = { LOW:'success', MEDIUM:'warning', HIGH:'danger' };

const DEPARTMENTS = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales', 'Engineering', 'Legal', 'Management', 'Other'];

export default function RequestForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qClient  = useQueryClient();
  const [charCount, setCharCount] = useState(0);

  const { register, handleSubmit, control, setError,
          formState: { errors, isDirty, isValid, touchedFields } } = useForm({
    resolver: yupResolver(schema),
    mode: 'onChange',
    defaultValues: {
      employeeName:'', productName:'', justification:'', priority:'MEDIUM',
      department:'', projectName:'', phoneNumber:'',
      quantity: 1, neededBy:'', assetId: null
    },
  });

  const { data: availableAssets } = useQuery({
    queryKey: queryKeys.assets.search({ status:'AVAILABLE', size:100 }),
    queryFn:  () => assetApi.search({ status:'AVAILABLE', size:100 }),
    staleTime: 60_000,
  });

  const submitMutation = useMutation({
    mutationFn: requestApi.submit,
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
      toast.success('✅ Request submitted successfully!');
      navigate('/requests');
    },
    onError: (error) => {
      const errs = error.response?.data?.errors;
      if (errs) Object.entries(errs).forEach(([f, m]) => setError(f, { message: m }));
      else toast.error(error.response?.data?.message || 'Submission failed');
    },
  });

  const onSubmit = (d) => submitMutation.mutate({ ...d, assetId: d.assetId || null, neededBy: d.neededBy || null });

  return (
    <Container className="py-4 request-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-1 fw-bold">📋 Submit Asset Request</h4>
          <p className="text-muted mb-0">Fill in all details so admin can process your request quickly</p>
        </div>
        <Badge bg="primary" className="px-3 py-2">{user?.branchName || 'Head Office'}</Badge>
      </div>

      <Card className="border-0 shadow-sm">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit(onSubmit)} noValidate>

            {/* ── Employee Info ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3 section-header">Employee Information</h6>
            <Row className="g-3 mb-4">
              <Col md={6}>
                <Form.Label className="fw-semibold">Full Name <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  placeholder="Enter your full name"
                  isInvalid={!!errors.employeeName}
                  isValid={touchedFields.employeeName && !errors.employeeName}
                  {...register('employeeName')}/>
                <Form.Control.Feedback type="invalid">{errors.employeeName?.message}</Form.Control.Feedback>
                <Form.Text className="text-muted">Letters, spaces, hyphens and apostrophes only</Form.Text>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Email</Form.Label>
                <Form.Control value={user?.email || ''} disabled className="bg-light"/>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Department <span className="text-danger">*</span></Form.Label>
                <Form.Select isInvalid={!!errors.department} {...register('department')}>
                  <option value="">— Select Department —</option>
                  {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.department?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Phone / Extension</Form.Label>
                <Form.Control placeholder="e.g. +1-555-0123 or ext. 4521"
                  {...register('phoneNumber')}/>
              </Col>
            </Row>

            <hr className="my-3"/>

            {/* ── Request Details ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3 section-header">Request Details</h6>
            <Row className="g-3 mb-4">
              <Col md={8}>
                <Form.Label className="fw-semibold">Product / Asset Name <span className="text-danger">*</span></Form.Label>
                <Form.Control as="textarea" rows={2}
                  placeholder="e.g. HP EliteBook 840 G10 Laptop 14 inch, 16GB RAM, 512GB SSD"
                  className="no-resize"
                  isInvalid={!!errors.productName}
                  isValid={touchedFields.productName && !errors.productName}
                  {...register('productName')}/>
                <Form.Control.Feedback type="invalid">{errors.productName?.message}</Form.Control.Feedback>
              </Col>
              <Col md={4}>
                <Form.Label className="fw-semibold">Quantity <span className="text-danger">*</span></Form.Label>
                <Form.Control type="number" min={1} max={50}
                  isInvalid={!!errors.quantity}
                  {...register('quantity')}/>
                <Form.Control.Feedback type="invalid">{errors.quantity?.message}</Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Project Name <span className="text-muted fw-normal">(if applicable)</span></Form.Label>
                <Form.Control placeholder="e.g. CRM Migration 2026"
                  {...register('projectName')}/>
              </Col>
              <Col md={6}>
                <Form.Label className="fw-semibold">Needed By Date</Form.Label>
                <Form.Control type="date" min={new Date().toISOString().split('T')[0]}
                  {...register('neededBy')}/>
              </Col>
              <Col md={12}>
                <Form.Label className="fw-semibold">Specific Asset <span className="text-muted fw-normal">(optional — pick from inventory)</span></Form.Label>
                <Controller name="assetId" control={control} render={({ field }) => (
                  <Form.Select {...field} value={field.value || ''}>
                    <option value="">— Request a new one —</option>
                    {availableAssets?.content?.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} · {a.serialNumber} · {a.branchName}
                        {a.purchasePrice ? ` · $${Number(a.purchasePrice).toLocaleString()}` : ''}
                      </option>
                    ))}
                  </Form.Select>
                )}/>
              </Col>
            </Row>

            <hr className="my-3"/>

            {/* ── Priority ── */}
            <h6 className="fw-bold text-muted text-uppercase mb-3 section-header">Priority & Justification</h6>
            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Priority <span className="text-danger">*</span></Form.Label>
              <div className="d-flex gap-3">
                {['LOW','MEDIUM','HIGH'].map(p => (
                  <Form.Check key={p} type="radio" id={`p-${p}`}
                    label={<Badge bg={PRIORITY_COLORS[p]} className="px-3 py-2">{p}</Badge>}
                    value={p} {...register('priority')}/>
                ))}
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label className="fw-semibold">Business Justification <span className="text-danger">*</span></Form.Label>
              <Form.Control as="textarea" rows={4}
                placeholder="Why do you need this asset? How will it impact your work? Is there an urgent deadline?"
                isInvalid={!!errors.justification}
                isValid={touchedFields.justification && !errors.justification}
                {...register('justification', { onChange: e => setCharCount(e.target.value.length) })}/>
              <Form.Control.Feedback type="invalid">{errors.justification?.message}</Form.Control.Feedback>
              <div className="d-flex justify-content-between mt-1">
                <small className="text-muted">{charCount}/1000 characters</small>
                <small className={charCount < 10 ? 'text-danger' : 'text-success'}>
                  {charCount < 10 ? `${10 - charCount} more needed` : '✓ Good'}
                </small>
              </div>
            </Form.Group>

            <div className="d-flex gap-3 justify-content-end border-top pt-4">
              <Button variant="outline-secondary" onClick={() => navigate('/requests')} disabled={submitMutation.isPending}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={!isDirty || !isValid || submitMutation.isPending}>
                {submitMutation.isPending ? <><Spinner size="sm" className="me-2"/>Submitting…</> : '📤 Submit Request'}
              </Button>
            </div>

          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
