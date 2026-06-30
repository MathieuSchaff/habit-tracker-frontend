import { createContext, useContext } from 'react'

// Bridges the hoisted header's "Add" action to the shelf body rendered through <Outlet />.
// Defaults to a no-op so standalone renders (tests) stay safe.
const CollectionAddContext = createContext<() => void>(() => {})

export const CollectionAddProvider = CollectionAddContext.Provider
export const useCollectionAdd = () => useContext(CollectionAddContext)
