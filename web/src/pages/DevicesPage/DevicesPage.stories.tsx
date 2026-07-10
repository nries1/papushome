import type { Meta, StoryObj } from '@storybook/react'

import DevicesPage from './DevicesPage'

const meta: Meta<typeof DevicesPage> = {
  component: DevicesPage,
}

export default meta

type Story = StoryObj<typeof DevicesPage>

export const Primary: Story = {}
