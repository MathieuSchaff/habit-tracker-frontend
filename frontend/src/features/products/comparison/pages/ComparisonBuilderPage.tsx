import { COMPARISON_MAX_PRODUCTS, COMPARISON_MIN_PRODUCTS } from '@aurore/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { useAnnounce } from '@/hooks/useAnnounce'
import {
  comparisonQueries,
  useCreateComparison,
  useUpdateComparison,
} from '@/lib/queries/comparisons'
import { ComparisonBody } from '../components/ComparisonBody'
import { ComparisonHeader } from '../components/ComparisonHeader'
import { EmptyComparisonState } from '../components/EmptyComparisonState'
import { ProductPicker } from '../components/ProductPicker'
import './ComparisonBuilderPage.css'

type Props =
  | { mode: 'new'; id?: never; seedProductId?: string }
  | { mode: 'edit'; id: string; seedProductId?: never }

export function ComparisonBuilderPage(props: Props) {
  if (props.mode === 'new') return <NewComparisonBuilder seedProductId={props.seedProductId} />
  return <EditComparisonBuilder id={props.id} />
}

function NewComparisonBuilder({ seedProductId }: { seedProductId?: string }) {
  const navigate = useNavigate()
  const create = useCreateComparison()
  const [productIds, setProductIds] = useState<string[]>(seedProductId ? [seedProductId] : [])
  const [name, setName] = useState<string>('')

  const isDirty = productIds.length > 0 || name.trim().length > 0

  // Guard the native back/close path; in-app cancel is the FormActions button below.
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const onSave = async () => {
    if (productIds.length < COMPARISON_MIN_PRODUCTS) return
    const created = await create.mutateAsync({
      name: name || undefined,
      productIds,
    })
    void navigate({ to: '/products/compare/$id', params: { id: created.id } })
  }

  return (
    <section>
      <ComparisonHeader
        name={name}
        onNameChange={setName}
        count={productIds.length}
        onSave={onSave}
        onCancel={isDirty ? () => void navigate({ to: '/products/compare' }) : undefined}
        canSave={productIds.length >= COMPARISON_MIN_PRODUCTS}
      />
      {create.error && (
        <FormMessage variant="error">Impossible de créer la comparaison. Réessayez.</FormMessage>
      )}
      <div className="comparison-builder-page">
        <div className="comparison-builder-page__picker">
          <ProductPicker selectedIds={productIds} onChange={setProductIds} />
        </div>
        <EmptyComparisonState
          count={productIds.length}
          onSave={onSave}
          isPending={create.isPending}
        />
      </div>
    </section>
  )
}

function EditComparisonBuilder({ id }: { id: string }) {
  const { data: comparison } = useSuspenseQuery(comparisonQueries.detail(id))
  const update = useUpdateComparison()
  const announce = useAnnounce()

  // Name autosaves on every keystroke; announcing it would flood, so only the
  // discrete product add/remove (content changes away from the picker) is announced.
  const setName = (name: string) => update.mutate({ id, input: { name } })

  // Schema rejects out-of-bounds counts; useMutation swallows the 400 and desyncs the picker.
  const setProductIds = (productIds: string[]) => {
    if (
      productIds.length < COMPARISON_MIN_PRODUCTS ||
      productIds.length > COMPARISON_MAX_PRODUCTS
    ) {
      return
    }
    update.mutate(
      { id, input: { productIds } },
      { onSuccess: () => announce('Comparaison mise à jour') }
    )
  }

  return (
    <section>
      <ComparisonHeader
        name={comparison.name ?? ''}
        onNameChange={setName}
        count={comparison.products.length}
        canSave={false}
      />
      {update.error && (
        <FormMessage variant="error">
          Impossible d&apos;enregistrer la modification. Réessayez.
        </FormMessage>
      )}
      <div className="comparison-builder-page">
        <div className="comparison-builder-page__picker">
          <ProductPicker
            selectedIds={comparison.products.map((p) => p.id)}
            onChange={setProductIds}
          />
        </div>
        {comparison.products.length < COMPARISON_MIN_PRODUCTS ? (
          <EmptyComparisonState count={comparison.products.length} />
        ) : (
          <ComparisonBody
            products={comparison.products}
            comparisonName={comparison.name}
            reference={`N° ${comparison.id.slice(0, 4).toUpperCase()}`}
          />
        )}
      </div>
    </section>
  )
}
