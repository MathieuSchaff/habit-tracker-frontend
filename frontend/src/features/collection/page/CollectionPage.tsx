import { useQuery } from '@tanstack/react-query'

import { userProductQueries } from '@/lib/queries/user-products'
import { CollectionTab } from '../components/tabs/CollectionTab/CollectionTab'
import { useCollectionAdd } from '../context/CollectionAddContext'

export const CollectionPage = () => {
  const openAdd = useCollectionAdd()
  const { data: userProducts } = useQuery(userProductQueries.list())

  return <CollectionTab userProducts={userProducts} onAddClick={openAdd} />
}
