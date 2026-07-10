// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const RobotPage = () => {
  return (
    <>
      <Metadata title="Robot" description="Robot page" />

      <h1>RobotPage</h1>
      <p>
        Find me in <code>./web/src/pages/RobotPage/RobotPage.tsx</code>
      </p>
      {/*
          My default route is named `robot`, link to me with:
          `<Link to={routes.robot()}>Robot</Link>`
      */}
    </>
  )
}

export default RobotPage
