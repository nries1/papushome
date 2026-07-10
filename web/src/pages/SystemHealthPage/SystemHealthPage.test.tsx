import { render } from '@redwoodjs/testing/web'

import SystemHealthPage from './SystemHealthPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('SystemHealthPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<SystemHealthPage />)
    }).not.toThrow()
  })
})
