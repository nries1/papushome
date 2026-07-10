import type { Meta, StoryObj } from '@storybook/react'

import PlantCarePage from './PlantCarePage'

const meta: Meta<typeof PlantCarePage> = {
  component: PlantCarePage,
}

export default meta

type Story = StoryObj<typeof PlantCarePage>

export const Primary: Story = {}
