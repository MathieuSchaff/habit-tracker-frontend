import { useQuery } from '@tanstack/react-query'

import { userProductQueries } from '@/lib/queries/user-products'
import { HistoryTab } from '../components/tabs/HistoryTab/HistoryTab'

export const CollectionAchatsPage = () => {
  const { data: userProducts } = useQuery(userProductQueries.list())

  return <HistoryTab userProducts={userProducts ?? []} />
}
