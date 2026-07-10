import { render } from '@redwoodjs/testing/web'

import PlantCarePage from './PlantCarePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('PlantCarePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<PlantCarePage />)
    }).not.toThrow()
  })
})
