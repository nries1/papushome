// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const HomeKnowledgePage = () => {
  return (
    <>
      <Metadata title="HomeKnowledge" description="HomeKnowledge page" />

      <h1>HomeKnowledgePage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/HomeKnowledgePage/HomeKnowledgePage.tsx</code>
      </p>
      {/*
          My default route is named `homeKnowledge`, link to me with:
          `<Link to={routes.homeKnowledge()}>HomeKnowledge</Link>`
      */}
    </>
  )
}

export default HomeKnowledgePage
