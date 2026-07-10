import { render } from '@redwoodjs/testing/web'

import HomeKnowledgePage from './HomeKnowledgePage'

//   Improve this test with help from the Redwood Testing Doc:
//   https://redwoodjs.com/docs/testing#testing-pages-layouts

describe('HomeKnowledgePage', () => {
  it('renders successfully', () => {
    expect(() => {
      render(<HomeKnowledgePage />)
    }).not.toThrow()
  })
})
