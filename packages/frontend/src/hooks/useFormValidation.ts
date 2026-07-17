import { useState, useCallback } from 'react';
import { validateForm, type FormConfig, type FieldValidation } from '../lib/validators';

export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationConfig: FormConfig
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const setValue = useCallback((field: string, value: any) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }, [errors]);

  const setFieldTouched = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors = validateForm(values, validationConfig);
    setErrors(newErrors);
    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    for (const key of Object.keys(validationConfig)) {
      allTouched[key] = true;
    }
    setTouched(allTouched);
    return Object.keys(newErrors).length === 0;
  }, [values, validationConfig]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const getFieldError = useCallback((field: string): string | undefined => {
    if (!touched[field]) return undefined;
    return errors[field];
  }, [errors, touched]);

  const getFieldProps = useCallback((field: string) => ({
    value: values[field] ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValue(field, e.target.value);
    },
    onBlur: () => setFieldTouched(field),
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  }), [values, errors, touched, setValue, setFieldTouched]);

  return {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    reset,
    getFieldError,
    getFieldProps,
    isValid: Object.keys(errors).length === 0,
  };
}
