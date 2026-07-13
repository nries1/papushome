import { useState } from 'react'

import { useMutation } from '@redwoodjs/web'

const GENERATE_QUESTIONS_MUTATION = gql`
  mutation GenerateHomeKnowledgeQuestionsMutation {
    generateHomeKnowledgeQuestions {
      question
      subject
      category
    }
  }
`

const PROCESS_ANSWERS_MUTATION = gql`
  mutation ProcessHomeKnowledgeAnswersMutation($pairs: [HomeKnowledgeAnswerPairInput!]!) {
    processHomeKnowledgeAnswers(pairs: $pairs) {
      saved
    }
  }
`

interface Question {
  question: string
  subject: string
  category: string
}

const HomeKnowledgeInterview = () => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [saveResult, setSaveResult] = useState<{ text: string; error: boolean } | null>(null)
  // generateHomeKnowledgeQuestions never throws on an LLM failure — it
  // catches internally and resolves to an empty array (confirmed live: with
  // Ollama unreachable, this returns `{ data: { generateHomeKnowledgeQuestions: [] } }`,
  // a normal 200, not a GraphQL error). So "attempted" distinguishes "never
  // tried yet" (render nothing) from "tried and got nothing back" (render a
  // message) — `error` alone isn't a reliable signal for this failure mode.
  const [attempted, setAttempted] = useState(false)

  const [generateQuestions, { loading: generating }] = useMutation(GENERATE_QUESTIONS_MUTATION, {
    onCompleted: (data) => {
      setQuestions(data.generateHomeKnowledgeQuestions)
      setAnswers(data.generateHomeKnowledgeQuestions.map(() => ''))
      setAttempted(true)
    },
    onError: () => setAttempted(true),
  })

  const [processAnswers, { loading: saving }] = useMutation(PROCESS_ANSWERS_MUTATION, {
    refetchQueries: ['HomeKnowledgeCoverageQuery', 'HomeKnowledgeQuery'],
    onCompleted: (data) => {
      const saved = data.processHomeKnowledgeAnswers.saved
      setSaveResult({ text: `${saved} fact${saved !== 1 ? 's' : ''} added`, error: false })
      generateQuestions()
    },
    onError: () => setSaveResult({ text: 'Something went wrong.', error: true }),
  })

  const handleSave = () => {
    // Build the input explicitly rather than spreading `q` — Apollo tags
    // query/mutation results with `__typename` for cache normalization, and
    // GraphQL input types reject unknown fields, so a naive `{ ...q, answer }`
    // spread fails validation (confirmed live: "Field \"__typename\" is not
    // defined by type \"HomeKnowledgeAnswerPairInput\"").
    const pairs = questions
      .map((q, i) => ({
        question: q.question,
        subject: q.subject,
        category: q.category,
        answer: answers[i]?.trim() ?? '',
      }))
      .filter((p) => p.answer)
    setSaveResult(null)
    processAnswers({ variables: { pairs } })
  }

  const handleNewQuestions = () => {
    setSaveResult(null)
    generateQuestions()
  }

  return (
    <div className="mb-6 rounded-2xl border border-white/10 bg-dash-card p-6">
      <span className="text-[0.7rem] uppercase tracking-widest text-dash-text-dim">Onboarding interview</span>
      <p className="mb-5 mt-1.5 text-[0.82rem] leading-relaxed text-dash-text-dim">
        Papu will ask questions to learn about your home and household. Answer as many as you like — skip any by
        leaving them blank.
      </p>

      {!attempted && !generating && (
        <button
          onClick={() => generateQuestions()}
          className="rounded-lg bg-dash-accent-blue px-5 py-2.5 text-[0.85rem] font-semibold text-slate-900 transition hover:opacity-85"
        >
          Start interview
        </button>
      )}

      {generating && (
        <div className="flex items-center gap-2.5 py-5 text-sm text-dash-text-dim">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-dash-accent-blue" />
          Papu is thinking of questions…
        </div>
      )}

      {!generating && attempted && questions.length === 0 && (
        <p className="text-sm text-dash-accent-red">
          Failed to load questions. Is the LLM online?{' '}
          <button onClick={handleNewQuestions} className="text-dash-accent-blue hover:underline">
            Try again
          </button>
        </p>
      )}

      {!generating && questions.length > 0 && (
        <>
          <div className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <span className="text-[0.68rem] uppercase tracking-widest text-dash-text-dim opacity-50">
                  Question {i + 1}
                </span>
                <div className="text-sm leading-snug text-dash-text-main">{q.question}</div>
                <textarea
                  rows={1}
                  placeholder="Leave blank to skip"
                  value={answers[i] ?? ''}
                  onChange={(e) => setAnswers((prev) => prev.map((a, idx) => (idx === i ? e.target.value : a)))}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-[0.88rem] leading-snug text-dash-text-main outline-none focus:border-dash-accent-blue"
                />
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className={`text-[0.82rem] ${saveResult?.error ? 'text-dash-accent-red' : 'text-dash-accent-green'}`}>
              {saveResult?.text}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={handleNewQuestions}
                disabled={generating}
                className="rounded-lg border border-slate-800 px-4 py-2.5 text-[0.82rem] text-dash-text-dim transition hover:border-dash-accent-blue hover:text-dash-accent-blue disabled:opacity-40"
              >
                New questions
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-dash-accent-blue px-5 py-2.5 text-[0.85rem] font-semibold text-slate-900 transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-35"
              >
                {saving ? 'Saving…' : 'Save answers'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default HomeKnowledgeInterview
