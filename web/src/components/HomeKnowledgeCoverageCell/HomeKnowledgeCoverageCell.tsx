import type { HomeKnowledgeCoverageQuery, HomeKnowledgeCoverageQueryVariables } from 'types/graphql'

import type { CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<HomeKnowledgeCoverageQuery, HomeKnowledgeCoverageQueryVariables> = gql`
  query HomeKnowledgeCoverageQuery {
    homeKnowledgeCoverage {
      pct
      categories {
        category
        label
        target
        count
        pct
      }
    }
  }
`

export const beforeQuery = () => ({ fetchPolicy: 'cache-and-network' as const })

const shellClass = 'mb-6 rounded-2xl border border-white/10 bg-dash-card p-6'

export const Loading = () => (
  <div className={shellClass}>
    <span className="text-[0.7rem] uppercase tracking-widest text-dash-text-dim">Knowledge coverage</span>
  </div>
)

export const Success = ({
  homeKnowledgeCoverage,
}: CellSuccessProps<HomeKnowledgeCoverageQuery, HomeKnowledgeCoverageQueryVariables>) => (
  <div className={shellClass}>
    <div className="mb-3.5 flex items-baseline justify-between">
      <span className="text-[0.7rem] uppercase tracking-widest text-dash-text-dim">Knowledge coverage</span>
      <span className="text-[1.8rem] font-bold leading-none text-dash-accent-blue">{homeKnowledgeCoverage.pct}%</span>
    </div>
    <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
      <div
        className="h-full rounded-full bg-dash-accent-blue transition-[width] duration-500"
        style={{ width: `${homeKnowledgeCoverage.pct}%` }}
      />
    </div>
    <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
      {homeKnowledgeCoverage.categories.map((c) => {
        const barColor = c.pct === 0 ? 'bg-red-400' : c.pct < 60 ? 'bg-amber-400' : 'bg-emerald-400'
        return (
          <div key={c.category} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.72rem] text-dash-text-dim">{c.label}</span>
              <span className="text-[0.68rem] text-dash-text-dim opacity-60">
                {c.count}/{c.target}
              </span>
            </div>
            <div className="h-[3px] overflow-hidden rounded-full bg-white/[0.07]">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  </div>
)
