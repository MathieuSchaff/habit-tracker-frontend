import type { EditTargetType } from '@aurore/shared'
import { PROPOSABLE_FIELDS } from '@aurore/shared'

import { PencilLine } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Modal } from '@/component/Dialog/Modal'
import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { Input } from '@/component/Input/Input'
import { Select } from '@/component/Input/Select/Select'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { useProposeSuggestedEdit } from '@/lib/queries/suggested-edits'
import { FIELD_LABELS, SUGGEST_LABELS } from './SuggestEditButton.constants'

type SuggestEditButtonProps = {
  targetType: EditTargetType
  targetId: string
}

// Long fields get a Textarea; short fields get a single-line Input.
const LONG_FIELDS = new Set(['inci', 'description'])

export function SuggestEditButton({ targetType, targetId }: SuggestEditButtonProps) {
  const fields = PROPOSABLE_FIELDS[targetType]
  const [open, setOpen] = useState(false)
  const [field, setField] = useState<string>(fields[0] ?? 'name')
  const [value, setValue] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const propose = useProposeSuggestedEdit()

  function close() {
    setOpen(false)
    setField(fields[0] ?? 'name')
    setValue('')
    setDone(false)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const trimmed = value.trim()
    if (trimmed.length < 1) {
      setError(SUGGEST_LABELS.valueRequired)
      return
    }
    propose.mutate(
      { targetType, targetId, field, proposedValue: trimmed },
      {
        onSuccess: () => setDone(true),
        onError: (err) => setError(err.message),
      }
    )
  }

  const fieldOptions = fields.map((f) => ({ value: f, label: FIELD_LABELS[f] ?? f }))

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={SUGGEST_LABELS.action}
      >
        <PencilLine size={14} aria-hidden="true" />
        <span>{SUGGEST_LABELS.action}</span>
      </Button>
      {open && (
        <Modal onClose={close} role="dialog" size="sm" className="suggest-modal">
          <Modal.Title className="suggest-modal__title">{SUGGEST_LABELS.title}</Modal.Title>
          {done ? (
            <>
              <p className="suggest-modal__message">{SUGGEST_LABELS.successMessage}</p>
              <div className="suggest-modal__actions">
                <Button onClick={close}>Fermer</Button>
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <Select
                label={SUGGEST_LABELS.fieldLabel}
                value={field}
                onValueChange={(v) => setField(v)}
                options={fieldOptions}
              />
              {LONG_FIELDS.has(field) ? (
                <Textarea
                  label={SUGGEST_LABELS.valueLabel}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={4}
                  maxLength={5000}
                />
              ) : (
                <Input
                  label={SUGGEST_LABELS.valueLabel}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  maxLength={200}
                />
              )}
              {error && <FormMessage variant="error">{error}</FormMessage>}
              <div className="suggest-modal__actions">
                <Button variant="ghost" onClick={close} type="button">
                  {SUGGEST_LABELS.cancel}
                </Button>
                <Button type="submit" loading={propose.isPending}>
                  {SUGGEST_LABELS.submit}
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
