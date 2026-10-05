import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { inputClasses } from './fieldStyles';

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

function FieldWrapper({ id, label, hint, error, children }: FieldWrapperProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-message`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-message`} className="mt-1.5 text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

interface CommonProps {
  label: string;
  hint?: string;
  error?: string;
}

function describedBy(id: string, hint?: string, error?: string) {
  return hint || error ? `${id}-message` : undefined;
}

export function TextField({
  label,
  hint,
  error,
  className = '',
  ...props
}: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClasses} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  className = '',
  ...props
}: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClasses} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className = '',
  children,
  ...props
}: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <FieldWrapper id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, hint, error)}
        className={`${inputClasses} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}
