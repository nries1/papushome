import type { Meta, StoryObj } from '@storybook/react'

import SystemHealthPage from './SystemHealthPage'

const meta: Meta<typeof SystemHealthPage> = {
  component: SystemHealthPage,
}

export default meta

type Story = StoryObj<typeof SystemHealthPage>

export const Primary: Story = {}
