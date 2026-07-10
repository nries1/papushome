import { render } from '@redwoodjs/testing/web'

import PhotoGalleryPage from './PhotoGalleryPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('PhotoGalleryPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<PhotoGalleryPage />)
    }).not.toThrow()
  })
})
