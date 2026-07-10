// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const SystemHealthPage = () => {
  return (
    <>
      <Metadata title="SystemHealth" description="SystemHealth page" />

      <h1>SystemHealthPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/SystemHealthPage/SystemHealthPage.tsx</code>
      </p>
      {/*
          My default route is named `systemHealth`, link to me with:
          `<Link to={routes.systemHealth()}>SystemHealth</Link>`
      */}
    </>
  )
}

export default SystemHealthPage
