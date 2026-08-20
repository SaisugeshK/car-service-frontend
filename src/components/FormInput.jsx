export default function FormInput({
  label,
  name,
  register,
  error,
  type = 'text',
  placeholder = '',
  required = false,
  step,
  disabled = false,
  ...rest
}) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        id={name}
        type={type}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        {...(register ? register(name) : {})}
        {...rest}
      />
      {error && <div className="invalid-feedback">{error.message}</div>}
    </div>
  );
}
