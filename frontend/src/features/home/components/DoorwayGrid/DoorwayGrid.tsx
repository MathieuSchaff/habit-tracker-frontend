import { DoorwayCard, type DoorwayItem } from './DoorwayCard'
import './DoorwayGrid.css'

export function DoorwayGrid({ cards }: { cards: DoorwayItem[] }) {
  return (
    <div className="aur-doorways">
      {cards.map(({ id, ...card }) => (
        <DoorwayCard key={id} {...card} />
      ))}
    </div>
  )
}
