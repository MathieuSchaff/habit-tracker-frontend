import { COMPARISON_MAX_PRODUCTS, COMPARISON_MIN_PRODUCTS } from '@habit-tracker/shared'

import { useSuspenseQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
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

type Props = { mode: 'new'; id?: never } | { mode: 'edit'; id: string }

export function ComparisonBuilderPage(props: Props) {
  if (props.mode === 'new') return <NewComparisonBuilder />
  return <EditComparisonBuilder id={props.id} />
}

function NewComparisonBuilder() {
  const navigate = useNavigate()
  const create = useCreateComparison()
  const [productIds, setProductIds] = useState<string[]>([])
  const [name, setName] = useState<string>('')

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
        canSave={productIds.length >= COMPARISON_MIN_PRODUCTS}
      />
      {create.error && (
        <FormMessage variant="error">Impossible de créer la comparaison. Réessayez.</FormMessage>
      )}
      <div className="comparison-builder-page">
        <div className="comparison-builder-page__picker">
          <ProductPicker selectedIds={productIds} onChange={setProductIds} />
        </div>
        <EmptyComparisonState count={productIds.length} />
      </div>
    </section>
  )
}

function EditComparisonBuilder({ id }: { id: string }) {
  const { data: comparison } = useSuspenseQuery(comparisonQueries.detail(id))
  const update = useUpdateComparison()

  const setName = (name: string) => update.mutate({ id, input: { name } })

  // Block PATCH client-side when count is out of bounds — schema rejects with 400
  // and useMutation swallows the error, leaving the picker desynced from server.
  const setProductIds = (productIds: string[]) => {
    if (
      productIds.length < COMPARISON_MIN_PRODUCTS ||
      productIds.length > COMPARISON_MAX_PRODUCTS
    ) {
      return
    }
    update.mutate({ id, input: { productIds } })
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
          <ComparisonBody products={comparison.products} />
        )}
      </div>
    </section>
  )
}
