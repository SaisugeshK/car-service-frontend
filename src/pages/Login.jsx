import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiLogIn, FiTool } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { loginSchema } from '../utils/validationSchemas';
import FormInput from '../components/FormInput';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="text-center mb-4">
          <FiTool size={30} className="text-primary mb-2" />
          <h4 className="mb-0">AutoCare ERP</h4>
          <p className="text-muted small">Sign in to continue</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <FormInput
            label="Email"
            name="email"
            type="email"
            register={register}
            error={errors.email}
            required
            placeholder="you@example.com"
          />
          <FormInput
            label="Password"
            name="password"
            type="password"
            register={register}
            error={errors.password}
            required
            placeholder="••••••••"
          />
          <button className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2 mt-2" disabled={submitting}>
            <FiLogIn /> {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
