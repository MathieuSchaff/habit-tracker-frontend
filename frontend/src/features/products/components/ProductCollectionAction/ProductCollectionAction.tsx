import type { UserProductStatus } from '@aurore/shared'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { Bookmark, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

import { Button } from '@/component/Button/Button'
import { statusLabels } from '@/features/collection/constants'
import { captureFrontendError } from '@/lib/observability/faro'
import { productQueries } from '@/lib/queries/products'
import { useCreateUserProduct } from '@/lib/queries/user-products'
import { useAuthStore } from '@/store/auth'
import { AddToCollectionModal } from '../AddToCollectionModal/AddToCollectionModal'
import './ProductCollectionAction.css'

interface ProductCollectionActionProps {
  product: {
    id: string
    name: string
    brand: string
    priceCents?: number | null
  }
}

export function ProductCollectionAction({ product }: ProductCollectionActionProps) {
  const user = useAuthStore((state) => state.user)
  const bootRefreshPending = useAuthStore((state) => state.bootRefreshPending)
  const [showDetails, setShowDetails] = useState(false)
  const navigate = useNavigate()
  const currentHref = useRouterState({ select: (state) => state.location.href })
  const queryClient = useQueryClient()
  const addUserProduct = useCreateUserProduct()

  const shelfStatusQuery = productQueries.shelfStatus(user?.id ?? null, [product.id])
  const {
    data: statusByProductId,
    isPending: isStatusPending,
    isError: isStatusError,
  } = useQuery(shelfStatusQuery)
  const currentStatus = user ? (statusByProductId?.get(product.id) ?? null) : null

  const redirectToLogin = () => {
    navigate({ to: '/auth/login', search: { redirect: currentHref } })
  }

  const openDetails = () => {
    if (!user) {
      redirectToLogin()
      return
    }
    setShowDetails(true)
  }

  const saveForLater = async () => {
    if (!user) {
      redirectToLogin()
      return
    }

    try {
      await addUserProduct.mutateAsync({ productId: product.id, status: 'watched' })
      queryClient.setQueryData<Map<string, UserProductStatus>>(
        shelfStatusQuery.queryKey,
        (previous) => {
          const next = new Map(previous)
          next.set(product.id, 'watched')
          return next
        }
      )
      toast.success('Sauvegardé dans « Garde un œil »')
    } catch (error) {
      captureFrontendError(error, { flow: 'product-detail-quick-save', productId: product.id })
      toast.error("Impossible de sauvegarder ce produit pour l'instant.")
    }
  }

  const statusConfig = currentStatus ? statusLabels[currentStatus] : null
  const isResolvingStatus = bootRefreshPending || (!!user && isStatusPending)

  return (
    <>
      {isResolvingStatus ? (
        <Button variant="accent" loading aria-label="Chargement de votre collection">
          Chargement
        </Button>
      ) : statusConfig ? (
        <Button
          variant="secondary"
          onClick={openDetails}
          className="product-collection-action__current"
          aria-label={`Dans votre collection : ${statusConfig.label}. Modifier ce produit dans ma collection.`}
        >
          <Check size={16} aria-hidden="true" />
          <span>{statusConfig.label}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
      ) : user && isStatusError ? (
        <Button variant="accent" onClick={openDetails}>
          <Bookmark size={16} aria-hidden="true" />
          Gérer ma collection
        </Button>
      ) : (
        <div className="product-collection-action">
          <Button
            variant="accent"
            onClick={saveForLater}
            loading={addUserProduct.isPending}
            className="product-collection-action__save"
            aria-label="Sauvegarder ce produit dans Garde un œil"
          >
            <Bookmark size={16} aria-hidden="true" />
            <span>Sauvegarder</span>
          </Button>
          <Button
            variant="accent"
            onClick={openDetails}
            disabled={addUserProduct.isPending}
            className="product-collection-action__details"
            aria-label="Ajouter avec un statut ou un achat"
            title="Choisir un statut ou enregistrer un achat"
          >
            <ChevronDown size={16} aria-hidden="true" />
          </Button>
        </div>
      )}

      {showDetails ? (
        <AddToCollectionModal
          product={product}
          currentStatus={currentStatus}
          onClose={() => setShowDetails(false)}
          onSuccess={() => setShowDetails(false)}
        />
      ) : null}
    </>
  )
}
