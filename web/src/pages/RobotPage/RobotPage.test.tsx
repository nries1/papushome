import { render } from '@redwoodjs/testing/web'

import RobotPage from './RobotPage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('RobotPage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<RobotPage />)
    }).not.toThrow()
  })
})
