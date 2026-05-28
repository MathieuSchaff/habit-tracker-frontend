import { useQueryClient } from '@tanstack/react-query'

import { ImageUpload } from '@/component/ImageUpload'
import { FormField } from '@/component/Input/FormField/FormField'
import { Input } from '@/component/Input/Input'
import { productKeys } from '@/lib/queries/products'

type CreateProps = {
  mode: 'create'
  endpoint: string | null
  imageUrl: string
  onUpload: (url: string) => void
}

type EditProps = {
  mode: 'edit'
  productSlug: string
  productName: string
  imageUrl: string
  altName: string
  onUpload: (url: string) => void
}

type Props = CreateProps | EditProps

export function ProductImageField(props: Props) {
  const queryClient = useQueryClient()

  if (props.mode === 'create') {
    if (!props.endpoint) {
      return (
        <FormField label="Image du produit">
          <p className="product-form__upload-hint">
            Entrez un nom et une marque pour ajouter une image.
          </p>
        </FormField>
      )
    }
    return (
      <FormField label="Image du produit">
        <ImageUpload
          shape="square"
          outputSize={1200}
          endpoint={props.endpoint}
          currentImageUrl={props.imageUrl}
          alt="Image du produit"
          onSuccess={props.onUpload}
        />
      </FormField>
    )
  }

  return (
    <FormField label="Image du produit">
      <ImageUpload
        shape="square"
        outputSize={1200}
        endpoint={`/api/uploads/product/${props.productSlug}`}
        currentImageUrl={props.imageUrl}
        alt={`Image de ${props.altName}`}
        onSuccess={(url) => {
          props.onUpload(url)
          queryClient.invalidateQueries({ queryKey: productKeys.all })
        }}
      />
      {props.imageUrl && (
        <Input
          id="edit-image-url"
          value={props.imageUrl}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          aria-label="URL de l'image (lecture seule)"
          hideRequired
        />
      )}
    </FormField>
  )
}
