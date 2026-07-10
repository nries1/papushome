import type { Meta, StoryObj } from '@storybook/react'

import PhotoGalleryPage from './PhotoGalleryPage'

const meta: Meta<typeof PhotoGalleryPage> = {
  component: PhotoGalleryPage,
}

export default meta

type Story = StoryObj<typeof PhotoGalleryPage>

export const Primary: Story = {}
