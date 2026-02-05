import type { InputHTMLAttributes } from "react";
import "./Input.css";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="ui-input__label" htmlFor={inputId}>
      {label && <span className="ui-input__label-text">{label}</span>}
      <input
        id={inputId}
        className={`ui-input ${error ? "ui-input--error" : ""} ${className}`.trim()}
        {...props}
      />
      {error && <span className="ui-input__error">{error}</span>}
    </label>
  );
}

interface TextAreaProps extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'rows'> {
  label?: string;
  error?: string;
  rows?: number;
}

export function TextArea({ label, error, className = "", id, ...props }: TextAreaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="ui-input__label" htmlFor={inputId}>
      {label && <span className="ui-input__label-text">{label}</span>}
      <textarea
        id={inputId}
        className={`ui-input ui-input--textarea ${error ? "ui-input--error" : ""} ${className}`.trim()}
        {...props}
      />
      {error && <span className="ui-input__error">{error}</span>}
    </label>
  );
}

export type { InputProps, TextAreaProps };
