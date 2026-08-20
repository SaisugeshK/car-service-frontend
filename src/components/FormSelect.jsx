export default function FormSelect({
  label,
  name,
  register,
  error,
  options = [],
  placeholder = 'Select...',
  required = false,
  disabled = false,
  valueKey = 'value',
  labelKey = 'label',
  ...rest
}) {
  return (
    <div className="mb-3">
      {label && (
        <label htmlFor={name} className="form-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        id={name}
        disabled={disabled}
        className={`form-select ${error ? 'is-invalid' : ''}`}
        {...(register ? register(name) : {})}
        {...rest}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt[valueKey]} value={opt[valueKey]}>
            {opt[labelKey]}
          </option>
        ))}
      </select>
      {error && <div className="invalid-feedback">{error.message}</div>}
    </div>
  );
}
