import { FormMessage } from '../FormMessage/FormMessage'

type FormErrorProps = {
  error: string | null
  fieldError: { field: unknown; message: string } | null
}

// Form-level error, suppressed when a field-level error already names the failure.
export function FormError({ error, fieldError }: FormErrorProps) {
  if (!error || fieldError) return null
  return <FormMessage variant="error">{error}</FormMessage>
}
