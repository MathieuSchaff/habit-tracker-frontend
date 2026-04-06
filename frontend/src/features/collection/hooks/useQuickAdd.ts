import type { UserProductStatus } from '@habit-tracker/shared'

import type React from 'react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useCreateProduct } from '@/lib/queries/products'
import { useAddPurchase } from '@/lib/queries/purchases'
import { useCreateUserProduct } from '@/lib/queries/user-products'
import { useDuplicateProductCheck } from './useDuplicateProductCheck'

interface UseQuickAddProps {
  onClose: () => void
}

export function useQuickAdd({ onClose }: UseQuickAddProps) {
  const [activeTab, setActiveTab] = useState<'existing' | 'new'>('existing')
  const [selectedProduct, setSelectedProduct] = useState<{
    id: string
    name: string
    brand: string
    slug: string
  } | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<UserProductStatus>('in_stock')
  const [purchasedAt, setPurchasedAt] = useState(() => new Date().toISOString().split('T')[0])
  const [purchasePrice, setPurchasePrice] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const [newName, setNewName] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [newKind, setNewKind] = useState('skincare')
  const [newUnit] = useState('flacon pompe')
  const [newBrandConfirmed, setNewBrandConfirmed] = useState(false)

  const createProduct = useCreateProduct()
  const addUserProduct = useCreateUserProduct()
  const addPurchase = useAddPurchase()

  const similarProducts = useDuplicateProductCheck(newName, newBrand)

  const addToCollection = async (productId: string) => {
    const created = await addUserProduct.mutateAsync({
      productId,
      status: selectedStatus,
    })

    if (selectedStatus === 'in_stock') {
      if (!created.id) throw new Error('userProduct created without id')
      await addPurchase.mutateAsync({
        userProductId: created.id,
        input: {
          purchasedAt,
          pricePaidCents: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
          expiresAt: expiresAt || undefined,
        },
      })
    }
  }

  const handleAddExisting = async () => {
    if (!selectedProduct) return
    try {
      await addToCollection(selectedProduct.id)
      toast.success(`${selectedProduct.name} ajouté à votre collection !`)
      onClose()
    } catch (error) {
      console.error('Failed to add product:', error)
      toast.error("Impossible d'ajouter le produit à votre collection.")
    }
  }

  const handleCreateAndAdd = async (e?: React.SubmitEvent<HTMLFormElement>) => {
    e?.preventDefault()
    try {
      const product = await createProduct.mutateAsync({
        name: newName,
        brand: newBrand,
        kind: newKind,
        unit: newUnit,
      })
      await addToCollection(product.id)
      toast.success(`${newName} créé et ajouté à votre collection !`)
      onClose()
    } catch (error) {
      console.error('Failed to create and add product:', error)
      toast.error("Impossible de créer ou d'ajouter le produit.")
    }
  }

  const isPending = createProduct.isPending || addUserProduct.isPending || addPurchase.isPending

  return {
    activeTab,
    setActiveTab,
    selectedProduct,
    setSelectedProduct,
    selectedStatus,
    setSelectedStatus,
    purchasedAt,
    setPurchasedAt,
    purchasePrice,
    setPurchasePrice,
    expiresAt,
    setExpiresAt,
    newName,
    setNewName,
    newBrand,
    setNewBrand,
    newKind,
    setNewKind,
    newBrandConfirmed,
    setNewBrandConfirmed,
    similarProducts,
    handleAddExisting,
    handleCreateAndAdd,
    isPending,
  }
}
