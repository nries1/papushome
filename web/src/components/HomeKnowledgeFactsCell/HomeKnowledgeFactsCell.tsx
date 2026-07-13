import { useState } from 'react'

import type { HomeKnowledgeQuery, HomeKnowledgeQueryVariables } from 'types/graphql'

import { useMutation } from '@redwoodjs/web'
import type { CellFailureProps, CellSuccessProps, TypedDocumentNode } from '@redwoodjs/web'

export const QUERY: TypedDocumentNode<HomeKnowledgeQuery, HomeKnowledgeQueryVariables> = gql`
  query HomeKnowledgeQuery {
    homeKnowledge {
      id
      subject
      category
      fact
    }
  }
`

export const beforeQuery = () => ({ fetchPolicy: 'cache-and-network' as const })

const CREATE_MUTATION = gql`
  mutation CreateHomeKnowledgeMutation($input: CreateHomeKnowledgeInput!) {
    createHomeKnowledge(input: $input) {
      id
    }
  }
`

const UPDATE_MUTATION = gql`
  mutation UpdateHomeKnowledgeMutation($id: Int!, $input: UpdateHomeKnowledgeInput!) {
    updateHomeKnowledge(id: $id, input: $input) {
      id
    }
  }
`

const DELETE_MUTATION = gql`
  mutation DeleteHomeKnowledgeMutation($id: Int!) {
    deleteHomeKnowledge(id: $id) {
      id
    }
  }
`

// Matches the old page's fixed <datalist> — not schema-enforced, just a
// typing aid, same as the old page's hardcoded <option> list.
const CATEGORY_SUGGESTIONS = ['identity', 'hobby', 'health', 'work', 'schedule', 'preference', 'social', 'home', 'contact']

type Fact = HomeKnowledgeQuery['homeKnowledge'][number]

const inputClass =
  'w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[0.88rem] text-dash-text-main outline-none focus:border-dash-accent-blue'
const smallInputClass =
  'w-full rounded-md border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-[0.85rem] text-dash-text-main outline-none focus:border-dash-accent-blue'
const iconBtnClass =
  'whitespace-nowrap rounded border border-slate-800 px-2 py-0.5 text-[0.72rem] text-dash-text-dim transition'

export const Loading = () => <p className="py-5 text-sm text-dash-text-dim">Loading facts…</p>

export const Failure = ({ error }: CellFailureProps<HomeKnowledgeQueryVariables>) => (
  <p className="py-5 text-sm text-dash-accent-red">Failed to load facts. {error?.message}</p>
)

export const Success = ({ homeKnowledge }: CellSuccessProps<HomeKnowledgeQuery, HomeKnowledgeQueryVariables>) => {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editSubject, setEditSubject] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editFact, setEditFact] = useState('')

  const [newSubject, setNewSubject] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newFact, setNewFact] = useState('')
  const [addStatus, setAddStatus] = useState<{ text: string; error: boolean } | null>(null)

  const refetchQueries = ['HomeKnowledgeQuery', 'HomeKnowledgeCoverageQuery']

  const [createFact, { loading: creating }] = useMutation(CREATE_MUTATION, {
    refetchQueries,
    onCompleted: () => {
      setNewSubject('')
      setNewCategory('')
      setNewFact('')
      setAddStatus({ text: 'Added.', error: false })
      setTimeout(() => setAddStatus(null), 2500)
    },
    onError: () => setAddStatus({ text: 'Failed to add.', error: true }),
  })

  const [updateFact] = useMutation(UPDATE_MUTATION, {
    refetchQueries,
    onCompleted: () => setEditingId(null),
  })

  const [deleteFact] = useMutation(DELETE_MUTATION, { refetchQueries })

  const subjects = [...new Set(homeKnowledge.map((f) => f.subject))]

  const handleAdd = () => {
    const subject = newSubject.trim()
    const category = newCategory.trim()
    const fact = newFact.trim()
    if (!subject || !category || !fact) {
      setAddStatus({ text: 'All three fields are required.', error: true })
      return
    }
    createFact({ variables: { input: { subject, category, fact } } })
  }

  const startEdit = (f: Fact) => {
    setEditingId(f.id)
    setEditSubject(f.subject)
    setEditCategory(f.category)
    setEditFact(f.fact)
  }

  const saveEdit = (id: number) => {
    const subject = editSubject.trim()
    const category = editCategory.trim()
    const fact = editFact.trim()
    if (!subject || !category || !fact) return
    updateFact({ variables: { id, input: { subject, category, fact } } })
  }

  const handleDelete = (id: number) => {
    if (!window.confirm('Delete this fact?')) return
    deleteFact({ variables: { id } })
  }

  const bySubject = new Map<string, Fact[]>()
  for (const f of homeKnowledge) {
    const list = bySubject.get(f.subject) ?? []
    list.push(f)
    bySubject.set(f.subject, list)
  }

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="mb-4 flex items-center gap-2.5 text-[0.7rem] uppercase tracking-widest text-dash-text-dim transition hover:text-dash-text-main"
      >
        <span className={`inline-block text-[0.6rem] transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>▶</span>
        All facts
      </button>

      {open && (
        <div>
          <div className="mb-5 grid grid-cols-[1fr_1fr_3fr_auto] items-end gap-2 rounded-xl border border-white/10 bg-dash-card p-4">
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] uppercase tracking-wide text-dash-text-dim">Subject</label>
              <input
                list="subject-suggestions"
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Nico"
                className={inputClass}
              />
              <datalist id="subject-suggestions">
                {subjects.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] uppercase tracking-wide text-dash-text-dim">Category</label>
              <input
                list="category-suggestions"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. hobby"
                className={inputClass}
              />
              <datalist id="category-suggestions">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] uppercase tracking-wide text-dash-text-dim">Fact</label>
              <textarea
                rows={1}
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleAdd()
                  }
                }}
                placeholder="e.g. Nico enjoys yoga as a hobby."
                className={`${inputClass} resize-y`}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={creating}
              className="whitespace-nowrap rounded-lg border border-dash-accent-blue bg-sky-400/15 px-4 py-2 text-[0.8rem] font-semibold text-dash-accent-blue transition hover:bg-sky-400/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Add
            </button>
            {addStatus && (
              <div className={`col-span-full text-[0.75rem] ${addStatus.error ? 'text-dash-accent-red' : 'text-dash-accent-green'}`}>
                {addStatus.text}
              </div>
            )}
          </div>

          {homeKnowledge.length === 0 ? (
            <div className="py-5 text-sm text-dash-text-dim">No facts yet.</div>
          ) : (
            Array.from(bySubject.entries()).map(([subject, rows]) => (
              <div key={subject} className="mb-5">
                <div className="mb-2 border-b border-[#1e3a5f] pb-1.5 text-[0.7rem] uppercase tracking-widest text-dash-accent-blue">
                  {subject}
                </div>
                {rows.map((f) =>
                  editingId === f.id ? (
                    <div key={f.id} className="mb-1.5 rounded-lg border border-dash-accent-blue bg-dash-card p-3">
                      <div className="mb-1.5 grid grid-cols-2 gap-1.5">
                        <input
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          list="subject-suggestions"
                          className={smallInputClass}
                        />
                        <input
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          list="category-suggestions"
                          className={smallInputClass}
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={editFact}
                        onChange={(e) => setEditFact(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            saveEdit(f.id)
                          }
                        }}
                        className={`${smallInputClass} mb-1.5 resize-y`}
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => saveEdit(f.id)}
                          className={`${iconBtnClass} hover:border-dash-accent-green hover:text-dash-accent-green`}
                        >
                          save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className={`${iconBtnClass} hover:border-dash-accent-blue hover:text-dash-accent-blue`}
                        >
                          cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={f.id}
                      className="mb-1.5 grid grid-cols-[110px_1fr_auto] items-start gap-2.5 rounded-lg border border-white/[0.06] bg-dash-card px-3 py-2.5 transition hover:border-white/[0.14]"
                    >
                      <div className="pt-0.5 text-[0.7rem] uppercase tracking-wide text-dash-text-dim">{f.category}</div>
                      <div className="text-[0.88rem] leading-snug text-dash-text-main">{f.fact}</div>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => startEdit(f)}
                          className={`${iconBtnClass} hover:border-dash-accent-blue hover:text-dash-accent-blue`}
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className={`${iconBtnClass} hover:border-dash-accent-red hover:text-dash-accent-red`}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
