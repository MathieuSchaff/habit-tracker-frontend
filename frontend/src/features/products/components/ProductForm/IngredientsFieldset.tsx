import type { ProductConcentrationUnit } from '@habit-tracker/shared'

import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { IngredientSearch } from '@/features/products/components/IngredientSearch/IngredientSearch'
import { DoseField } from '@/features/products/components/ProductForm/DoseField'

export type IngredientItem = {
  ingredientId: string
  ingredientName: string
  concentrationValue: string
  concentrationUnit: ProductConcentrationUnit | ''
}

type Props = {
  mode: 'create' | 'edit'
  items: IngredientItem[]
  onPersist: (
    ingredientId: string,
    next: { value: string; unit: ProductConcentrationUnit | '' }
  ) => void
  onRemove: (ingredientId: string) => void
  onAdd: (ingredientId: string, ingredientName: string) => void
  removingIngredientId: string | undefined
  isUpdating: boolean
}

export function IngredientsFieldset({
  mode,
  items,
  onPersist,
  onRemove,
  onAdd,
  removingIngredientId,
  isUpdating,
}: Props) {
  return (
    <fieldset className="form-field">
      <legend className="form-field__label">Ingrédients</legend>
      <div className="product-edit-ingredients">
        {items.length === 0 && (
          <p className="product-edit-ingredients__empty">
            {mode === 'edit' ? 'Aucun ingrédient associé.' : 'Aucun ingrédient ajouté.'}
          </p>
        )}
        {items.map((ing) => (
          <IngredientRow
            key={ing.ingredientId}
            ingredientName={ing.ingredientName}
            initialValue={ing.concentrationValue}
            initialUnit={ing.concentrationUnit}
            onPersist={(next) => onPersist(ing.ingredientId, next)}
            onRemove={() => onRemove(ing.ingredientId)}
            removing={removingIngredientId === ing.ingredientId}
            updating={isUpdating}
          />
        ))}
      </div>

      <IngredientSearch existingIds={items.map((i) => i.ingredientId)} onAdd={onAdd} />
    </fieldset>
  )
}

type IngredientRowProps = {
  ingredientName: string
  initialValue: string
  initialUnit: ProductConcentrationUnit | ''
  onPersist: (next: { value: string; unit: ProductConcentrationUnit | '' }) => void
  onRemove: () => void
  removing: boolean
  updating: boolean
}

function IngredientRow({
  ingredientName,
  initialValue,
  initialUnit,
  onPersist,
  onRemove,
  removing,
  updating,
}: IngredientRowProps) {
  const [value, setValue] = useState(initialValue)
  const [unit, setUnit] = useState<ProductConcentrationUnit | ''>(initialUnit)

  return (
    <div className="product-edit-ingredient">
      <span className="product-edit-ingredient__name">{ingredientName}</span>
      <DoseField
        value={value}
        unit={unit}
        onValueChange={setValue}
        onUnitChange={(nextUnit) => {
          setUnit(nextUnit)
          onPersist({ value, unit: nextUnit })
        }}
        onValueBlur={() => {
          if (value !== initialValue) onPersist({ value, unit })
        }}
        valueAriaLabel={`Dose de ${ingredientName}`}
        unitAriaLabel={`Unité pour ${ingredientName}`}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="product-edit-ingredient__remove"
        aria-label={`Retirer ${ingredientName}`}
        onClick={onRemove}
        disabled={removing || updating}
      >
        <Trash2 size={14} aria-hidden="true" />
      </Button>
    </div>
  )
}
