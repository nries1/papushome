// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const PlantCarePage = () => {
  return (
    <>
      <Metadata title="PlantCare" description="PlantCare page" />

      <h1>PlantCarePage</h1>
      <p>
        Find me in <code>./web/src/pages/PlantCarePage/PlantCarePage.tsx</code>
      </p>
      {/*
          My default route is named `plantCare`, link to me with:
          `<Link to={routes.plantCare()}>PlantCare</Link>`
      */}
    </>
  )
}

export default PlantCarePage
