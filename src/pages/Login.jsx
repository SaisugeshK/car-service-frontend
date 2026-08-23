import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiLogIn, FiTool, FiPhone, FiMail, FiLock, FiEye, FiEyeOff,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useCompanyProfile } from '../context/CompanyProfileContext';
import { loginSchema } from '../utils/validationSchemas';

// Presentation only — every piece of this screen that used to say a hardcoded company name now
// reads it from CompanyProfileContext (the same public Company Profile Navbar/Sidebar/PDFs use).
// None of the auth logic below (useForm/yupResolver/login()/navigate/error handling) changed from
// before this branding pass; only the JSX returned at the bottom did.
export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const { companyName, tagline, logo, phone, whatsapp, hasCustomName } = useCompanyProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: yupResolver(loginSchema) });

  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname || '/'} replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      // The global axios response interceptor already shows a toast for the failed request
      // (400/401/etc.) — a second one here would double up. Only cover the one case the
      // interceptor can't: a 2xx response that's missing an access token (see AuthContext.login).
      if (!err?.response) {
        toast.error(err?.message || 'Invalid email or password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const contactNumbers = [phone, whatsapp].filter((n, i, arr) => n && arr.indexOf(n) === i);

  return (
    <div className="auth-shell">
      <div className="auth-card-wrap">
        <div className="auth-card">
          {/* Left — brand panel. Dark charcoal + gold, wave-cut edge into the light panel. */}
          <div className="auth-brand-panel">
            <svg className="auth-wave" viewBox="0 0 100 400" preserveAspectRatio="none" aria-hidden="true">
              <path d="M0,0 C70,60 70,140 30,200 C70,260 70,340 0,400 L0,400 Z" />
            </svg>

            <div className="auth-brand-content">
              {logo ? (
                <img
                  src={logo}
                  alt={`${companyName} logo`}
                  style={{ maxWidth: 84, maxHeight: 64, objectFit: 'contain', margin: '0 0 14px' }}
                />
              ) : (
                <div
                  className="d-flex align-items-center justify-content-center mb-3"
                  style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand-gold-light), var(--brand-gold))',
                  }}
                >
                  <FiTool size={24} color="#161616" />
                </div>
              )}

              <div className="fw-bold text-white text-uppercase" style={{ fontSize: '0.9rem', letterSpacing: '0.04em' }}>
                {companyName}
              </div>
              {(tagline || !hasCustomName) && (
                <div
                  className="fw-semibold text-uppercase mt-1"
                  style={{ color: 'var(--brand-gold-light)', letterSpacing: '0.12em', fontSize: '0.66rem' }}
                >
                  {tagline || 'Sign in to continue'}
                </div>
              )}

              <h2 className="text-white fw-bold mt-4 mb-2">Welcome Back!</h2>
              <p className="mb-0" style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem', maxWidth: 240 }}>
                Car &amp; Bike Service Center — sign in with your workshop credentials to continue.
              </p>
            </div>
          </div>

          {/* Right — form panel. Light surface, pill inputs, same auth logic as before. */}
          <div className="auth-form-panel">
            <div className="mb-4">
              <h3 className="fw-bold mb-1" style={{ color: 'var(--erp-charcoal)' }}>Welcome</h3>
              <p className="mb-0 text-secondary small">Login to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="mb-3">
                <label htmlFor="email" className="auth-pill-label">
                  Email <span className="text-danger">*</span>
                </label>
                <div className="auth-input-group">
                  <span className="auth-input-icon"><FiMail size={15} /></span>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className={`form-control form-control-pill ${errors.email ? 'is-invalid' : ''}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <div className="invalid-feedback d-block">{errors.email.message}</div>}
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="auth-pill-label">
                  Password <span className="text-danger">*</span>
                </label>
                <div className="auth-input-group has-toggle">
                  <span className="auth-input-icon"><FiLock size={15} /></span>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`form-control form-control-pill ${errors.password ? 'is-invalid' : ''}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="auth-input-toggle"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {errors.password && <div className="invalid-feedback d-block">{errors.password.message}</div>}
              </div>

              <button
                className="btn btn-brand-gold auth-pill-btn w-100 d-flex align-items-center justify-content-center gap-2 mt-4 text-uppercase py-2"
                disabled={submitting}
              >
                <FiLogIn /> {submitting ? 'Logging in...' : 'Login'}
              </button>
            </form>

            {contactNumbers.length > 0 && (
              <div className="text-center mt-4 pt-3" style={{ borderTop: '1px solid var(--erp-border)' }}>
                {contactNumbers.map((n) => (
                  <div key={n} className="d-flex align-items-center justify-content-center gap-2 small text-secondary">
                    <FiPhone size={12} style={{ color: 'var(--brand-gold-dark)' }} />
                    {n}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
