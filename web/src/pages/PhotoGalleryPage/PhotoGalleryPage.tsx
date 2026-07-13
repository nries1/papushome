import { useRef, useState } from 'react'

import { useMutation } from '@redwoodjs/web'
import { Metadata } from '@redwoodjs/web'

import PhotosCell from 'src/components/PhotosCell'
import { useAdminStatus } from 'src/hooks/useAdminStatus'
import { useConfig } from 'src/hooks/useConfig'
import DashboardLayout from 'src/layouts/DashboardLayout/DashboardLayout'

import { CREATE_PHOTO_MUTATION } from './mutations'

const DEFAULT_REACTIONS = ['🥹', '😂', '🥰', '❤️']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const PhotoGalleryPage = () => {
  const { isAdmin } = useAdminStatus()
  const { config } = useConfig()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const [createPhoto] = useMutation(CREATE_PHOTO_MUTATION, {
    refetchQueries: ['PhotosQuery'],
  })

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    const file = fileInputRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const dataBase64 = await fileToBase64(file)
      await createPhoto({ variables: { input: { filename: file.name, dataBase64 } } })
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <Metadata title="Photo Gallery" description="Family photos and reactions" />

      <DashboardLayout title="The Family Gallery">
        <p className="mb-10 text-slate-400">
          The photo album for <i>everyone.</i>
        </p>

        {isAdmin && (
          <section className="mb-10 rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Add a Memory</h2>
            <form onSubmit={handleUpload} className="flex flex-wrap items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="text-sm text-slate-400 file:mr-4 file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-500"
              />
              <button
                type="submit"
                disabled={uploading}
                className="rounded-full bg-blue-600 px-6 py-2 font-bold transition hover:bg-blue-500 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </form>
          </section>
        )}

        <PhotosCell reactions={config?.reactions ?? DEFAULT_REACTIONS} />
      </DashboardLayout>
    </>
  )
}

export default PhotoGalleryPage
