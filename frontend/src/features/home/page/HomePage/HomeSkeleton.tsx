import { Spinner } from '@/component/Feedback/ui/Spinner/Spinner'

// Neutral boot placeholder: shown while the cold-load session probe is in flight
// so the page never flashes the anonymous marketing hero before resolving to the hub.
export function HomeSkeleton() {
  return (
    <div className="aur-hub-boot" aria-hidden="true">
      <Spinner />
    </div>
  )
}
