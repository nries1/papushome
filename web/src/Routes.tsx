// In this file, all Page components from 'src/pages` are auto-imported. Nested
// directories are supported, and should be uppercase. Each subdirectory will be
// prepended onto the component name.
//
// Examples:
//
// 'src/pages/HomePage/HomePage.js'         -> HomePage
// 'src/pages/Admin/BooksPage/BooksPage.js' -> AdminBooksPage

import { Router, Route } from '@redwoodjs/router'

const Routes = () => {
  return (
    <Router>
      <Route path="/system-health" page={SystemHealthPage} name="systemHealth" />
      <Route path="/robot" page={RobotPage} name="robot" />
      <Route path="/home-knowledge" page={HomeKnowledgePage} name="homeKnowledge" />
      <Route path="/photo-gallery" page={PhotoGalleryPage} name="photoGallery" />
      <Route path="/plant-care" page={PlantCarePage} name="plantCare" />
      <Route path="/devices" page={DevicesPage} name="devices" />
      <Route path="/" page={HomePage} name="home" />
      <Route notfound page={NotFoundPage} />
    </Router>
  )
}

export default Routes
