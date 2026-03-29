import type { UserProductStatus } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import type React from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { useScrollLock } from '@/hooks/useScrollLock'
import { productQueries, useCreateProduct } from '@/lib/queries/products'
import { useAddPurchase } from '@/lib/queries/purchases'
import { useCreateUserProduct } from '@/lib/queries/user-products'

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

  // We check if the product already exists with this name or brand
  // so we don't create it two times by mistake.
  const [debouncedNewName, setDebouncedNewName] = useState('')
  const [debouncedNewBrand, setDebouncedNewBrand] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedNewName(newName.trim())
      setDebouncedNewBrand(newBrand.trim())
    }, 400)
    return () => clearTimeout(timer)
  }, [newName, newBrand])

  const { data: similarProducts } = useQuery({
    ...productQueries.checkDuplicate(debouncedNewName, debouncedNewBrand),
    enabled: debouncedNewName.length >= 2 && debouncedNewBrand.length >= 1,
  })

  useScrollLock(true)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAddExisting = async () => {
    if (!selectedProduct) return
    try {
      // When a product is 'in_stock', we also need to save when we bought it.
      if (selectedStatus === 'in_stock') {
        const created = await addUserProduct.mutateAsync({
          productId: selectedProduct.id,
          status: 'in_stock',
        })
        if (!created.id) throw new Error('userProduct created without id')
        await addPurchase.mutateAsync({
          userProductId: created.id,
          input: {
            purchasedAt,
            pricePaidCents: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
            expiresAt: expiresAt || undefined,
          },
        })
      } else {
        await addUserProduct.mutateAsync({
          productId: selectedProduct.id,
          status: selectedStatus,
        })
      }
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
      // First we must create the product in the global catalogue,
      // then we can add it to the user's personal collection.
      const product = await createProduct.mutateAsync({
        name: newName,
        brand: newBrand,
        kind: newKind,
        unit: newUnit,
      })

      if (selectedStatus === 'in_stock') {
        const created = await addUserProduct.mutateAsync({
          productId: product.id,
          status: 'in_stock',
        })
        if (!created.id) throw new Error('userProduct created without id')
        await addPurchase.mutateAsync({
          userProductId: created.id,
          input: {
            purchasedAt,
            pricePaidCents: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) : undefined,
            expiresAt: expiresAt || undefined,
          },
        })
      } else {
        await addUserProduct.mutateAsync({
          productId: product.id,
          status: selectedStatus,
        })
      }
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
