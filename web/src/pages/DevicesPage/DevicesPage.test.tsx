import { render } from '@redwoodjs/testing/web'

import DevicesPage from './DevicesPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('DevicesPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<DevicesPage />)
    }).not.toThrow()
  })
})
