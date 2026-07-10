import type { Meta, StoryObj } from '@storybook/react'

import RobotPage from './RobotPage'

const meta: Meta<typeof RobotPage> = {
  component: RobotPage,
}

export default meta

type Story = StoryObj<typeof RobotPage>

export const Primary: Story = {}
