// import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const PhotoGalleryPage = () => {
  return (
    <>
      <Metadata title="PhotoGallery" description="PhotoGallery page" />

      <h1>PhotoGalleryPage</h1>
      <p>
        Find me in{' '}
        <code>./web/src/pages/PhotoGalleryPage/PhotoGalleryPage.tsx</code>
      </p>
      {/*
          My default route is named `photoGallery`, link to me with:
          `<Link to={routes.photoGallery()}>PhotoGallery</Link>`
      */}
    </>
  )
}

export default PhotoGalleryPage
