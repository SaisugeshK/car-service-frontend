import { useEffect, useState } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';

export default function SearchBar({ value, onChange, placeholder = 'Search...', delay = 350 }) {
  const [localValue, setLocalValue] = useState(value || '');

  useEffect(() => setLocalValue(value || ''), [value]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localValue !== value) onChange(localValue);
    }, delay);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  return (
    <div className="input-group" style={{ maxWidth: 320 }}>
      <span className="input-group-text bg-white">
        <FiSearch />
      </span>
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
      />
      {localValue && (
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={() => setLocalValue('')}
        >
          <FiX />
        </button>
      )}
    </div>
  );
}
