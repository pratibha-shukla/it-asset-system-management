import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useMutation } from '@tanstack/react-query';
import { Container, Card, Form, Button, Spinner, InputGroup } from 'react-bootstrap';
import { authApi }        from '../api/authApi';
import { setCredentials } from '../store/authSlice';
import { usePageTitle }   from '../hooks/usePageTitle';
import { queryClient }    from '../queryClient';
import { isValidEmail } from '../utils/validators';
import './Login.css';

// Login only checks that fields are not empty — password format validation
// is for registration only. The backend handles credential verification.
const loginSchema = yup.object({
  email:    yup.string().required('Email is required').test('email-regex', 'Enter a valid email address', isValidEmail),
  password: yup.string().required('Password is required'),
});

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPwd, setShowPwd] = useState(false);

  // WCAG 2.4.2: descriptive page title
  usePageTitle('Sign In');

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Query keys (assets, requests, admin stats, ...) aren't scoped by user
      // identity, so a stale cache from a PREVIOUS session in this same tab
      // would otherwise be served to whoever just logged in — clear it so
      // every query refetches fresh for this user.
      queryClient.clear();
      dispatch(setCredentials(data));
      navigate('/dashboard', { replace: true });
    },
    onError:   (error) => {
      const msg = error.response?.data?.message || 'Invalid email or password';
      setError('password', { message: msg });
    },
  });

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center login-page">
      <Container className="login-container">
        <div className="text-center mb-4" aria-hidden="true">
          <div className="login-logo">🖥️</div>
        </div>
        {/* WCAG 1.3.1: heading hierarchy — h1 is the page landmark */}
        <h1 className="text-white fw-bold text-center mb-1 fs-3">IT Asset Manager</h1>
        <p className="text-secondary text-center mb-4">Sign in to your account</p>

        <Card className="shadow-lg border-0 login-card">
          <Card.Body className="p-4">
            {/*
              WCAG 1.3.1 / 4.1.2:
              - Each input has an explicit id and htmlFor association.
              - aria-describedby links the live error region to the input.
              - aria-required communicates required fields to AT.
              - aria-invalid reflects validation state.
            */}
            <Form
              onSubmit={handleSubmit((d) => loginMutation.mutate(d))}
              noValidate
              aria-label="Sign in form"
            >
              {/* Email — no controlId; id on Form.Control + htmlFor on Label avoids
                   the "controlId is ignored when id is specified" React Bootstrap warning */}
              <Form.Group className="mb-3">
                <Form.Label htmlFor="login-email" className="fw-semibold">
                  Email Address <span aria-hidden="true" className="text-danger">*</span>
                  <span className="sr-only">(required)</span>
                </Form.Label>
                <Form.Control
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  isInvalid={!!errors.email}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  aria-required="true"
                  {...register('email')}
                />
                {errors.email && (
                  <Form.Control.Feedback type="invalid" id="login-email-error" role="alert">
                    {errors.email.message}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              {/* Password */}
              <Form.Group className="mb-4">
                <Form.Label htmlFor="login-password" className="fw-semibold">
                  Password <span aria-hidden="true" className="text-danger">*</span>
                  <span className="sr-only">(required)</span>
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    isInvalid={!!errors.password}
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'login-password-error' : undefined}
                    aria-required="true"
                    {...register('password')}
                  />
                  {/* WCAG 2.1.1: tabIndex removed (not -1) so keyboard users can toggle */}
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPwd((p) => !p)}
                    aria-pressed={showPwd}
                    aria-label={showPwd ? 'Hide password' : 'Show password'}
                    type="button"
                  >
                    <span aria-hidden="true">{showPwd ? '🙈' : '👁️'}</span>
                  </Button>
                  {errors.password && (
                    <Form.Control.Feedback type="invalid" id="login-password-error" role="alert">
                      {errors.password.message}
                    </Form.Control.Feedback>
                  )}
                </InputGroup>
              </Form.Group>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-100 fw-semibold"
                disabled={loginMutation.isPending}
                aria-busy={loginMutation.isPending}
              >
                {loginMutation.isPending
                  ? <><Spinner size="sm" className="me-2" aria-hidden="true" />Signing in…</>
                  : 'Sign In'}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
}
