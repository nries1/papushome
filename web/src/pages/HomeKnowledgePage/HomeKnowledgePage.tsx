import { Metadata } from '@redwoodjs/web'

import HomeKnowledgeCoverageCell from 'src/components/HomeKnowledgeCoverageCell'
import HomeKnowledgeFactsCell from 'src/components/HomeKnowledgeFactsCell'
import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

import HomeKnowledgeInterview from './HomeKnowledgeInterview'

// The old page's "Recognized people" section (GET /api/vision/people,
// POST /api/vision/enroll) is not ported — both routes queried a
// `vision_people` table that doesn't exist in the real database (confirmed
// dead code back in the Diff 1 dao.ts port), and neither has any GraphQL
// equivalent today. The real enrolled-face data lives in
// robot-vision-worker/known_faces/encodings.pkl, written only by the
// learn_face.py CLI tool — there's no API surface to read or write it from
// the web app at all yet. Revisit if/when that gets its own backend.
const HomeKnowledgePage = () => {
  return (
    <>
      <Metadata title="Papu's Memory" description="Papu's memory of your home and household" />

      <DashboardLayout title="Papu's Memory">
        <HomeKnowledgeCoverageCell />
        <HomeKnowledgeInterview />
        <HomeKnowledgeFactsCell />
      </DashboardLayout>
    </>
  )
}

export default HomeKnowledgePage
