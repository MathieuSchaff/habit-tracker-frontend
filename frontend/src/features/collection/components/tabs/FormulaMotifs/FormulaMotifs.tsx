import { useQuery } from '@tanstack/react-query'
import { Eye, Info, Package, Sparkles } from 'lucide-react'

import { EmptyState } from '@/component/Feedback/ui/EmptyState/EmptyState'
import { BENEFIT_AXIS_PHRASE, RISK_AXIS_PHRASE } from '@/constants/derm'
import {
  collectionQueries,
  type FormulaMotifs as FormulaMotifsData,
} from '@/lib/queries/collection'

import './FormulaMotifs.css'

type AxisMotif = FormulaMotifsData['benefits'][number]

const benefitLabel = (axis: string) =>
  BENEFIT_AXIS_PHRASE[axis as keyof typeof BENEFIT_AXIS_PHRASE] ?? axis
const noteLabel = (axis: string) => RISK_AXIS_PHRASE[axis as keyof typeof RISK_AXIS_PHRASE] ?? axis

export function FormulaMotifs() {
  const { data } = useQuery(collectionQueries.formulaMotifs())

  if (!data) return null

  if (data.productsAnalyzed === 0) {
    return (
      <EmptyState
        icon={<Package size={48} />}
        subtitle="Ajoutez quelques produits avec leur composition pour qu'Aurore dégage des motifs de formule."
      />
    )
  }

  return (
    <div className="fmotif-container">
      <p className="fmotif-intro">
        Aurore lit la composition de vos produits et regarde ce qui revient.
      </p>

      <div className="fmotif-grid">
        <MotifCard
          tone="benefit"
          title="Ce qui revient"
          icon={<Sparkles size={24} />}
          description="Bénéfices que les compositions de votre étagère partagent le plus souvent."
          motifs={data.benefits}
          label={benefitLabel}
          emptyText="Pas encore assez de compositions reconnues pour dégager un motif."
        />
        <MotifCard
          tone="note"
          title="Points à noter"
          icon={<Eye size={24} />}
          description="Signaux qui reviennent dans plusieurs formules — à connaître, jamais une alerte."
          motifs={data.notes}
          label={noteLabel}
          emptyText="Rien qui revienne sur plusieurs produits pour l'instant."
        />
      </div>

      <p className="fmotif-footnote">
        <Info size={14} aria-hidden="true" />
        <span>
          Estimation sur la composition, pas un classement, une recommandation ni un avis médical.
        </span>
      </p>
    </div>
  )
}

function MotifCard({
  tone,
  title,
  icon,
  description,
  motifs,
  label,
  emptyText,
}: {
  tone: 'benefit' | 'note'
  title: string
  icon: React.ReactNode
  description: string
  motifs: AxisMotif[]
  label: (axis: string) => string
  emptyText: string
}) {
  return (
    <section className={`fmotif-card fmotif-card--${tone}`}>
      <div className="fmotif-header">
        <div className="fmotif-icon-wrap">{icon}</div>
        <div>
          <h3 className="fmotif-title">{title}</h3>
          <p className="fmotif-desc">{description}</p>
        </div>
      </div>

      <div className="fmotif-list">
        {motifs.length > 0 ? (
          motifs.map((m) => (
            <div key={m.axis} className="fmotif-item" title={m.samples.join(', ')}>
              <span className="fmotif-axis">{label(m.axis)}</span>
              <span className="fmotif-count">
                {m.count} produit{m.count > 1 ? 's' : ''}
              </span>
            </div>
          ))
        ) : (
          <p className="fmotif-empty">{emptyText}</p>
        )}
      </div>
    </section>
  )
}
