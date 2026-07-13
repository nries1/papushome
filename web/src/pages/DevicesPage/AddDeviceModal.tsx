import { useState } from 'react'

import { useMutation } from '@redwoodjs/web'

import Modal from 'src/components/Modal/Modal'

import { CREATE_DEVICE_MUTATION } from './mutations'
import type { Room } from './types'

const DEVICE_TYPES = [
  { value: 'env_sensor', label: 'Environment Sensor' },
  { value: 'pump', label: 'Water Pump Node' },
  { value: 'rgb_display', label: 'RGB Display' },
]

const inputClass =
  'w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm box-border'
const labelClass = 'block text-xs uppercase tracking-wide text-slate-400 mb-1.5'

export default function AddDeviceModal({
  rooms,
  onClose,
}: {
  rooms: Room[]
  onClose: () => void
}) {
  const [deviceId, setDeviceId] = useState('')
  const [friendlyName, setFriendlyName] = useState('')
  const [deviceType, setDeviceType] = useState(DEVICE_TYPES[0].value)
  const [model, setModel] = useState('')
  const [hardwareVersion, setHardwareVersion] = useState('v1')
  const [roomId, setRoomId] = useState<string>('')
  const [hasOta, setHasOta] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [createDevice, { loading }] = useMutation(CREATE_DEVICE_MUTATION, {
    refetchQueries: ['DevicesWithStatusQuery'],
    onCompleted: () => onClose(),
    onError: (err) => setError(err.message),
  })

  const handleSave = () => {
    setError(null)

    if (!deviceId.trim() || !friendlyName.trim()) {
      setError('Device ID and Friendly Name are required.')
      return
    }
    if (!model.trim()) {
      setError('Hardware model is required.')
      return
    }

    createDevice({
      variables: {
        input: {
          deviceId: deviceId.trim(),
          friendlyName: friendlyName.trim(),
          deviceType,
          model: model.trim(),
          hardwareVersion: hardwareVersion.trim() || 'v1',
          hasOta,
          roomId: roomId ? Number(roomId) : null,
          config: {},
        },
      },
    })
  }

  return (
    <Modal title="Add Device" onClose={onClose}>
      <div className="mb-3.5">
        <label className={labelClass}>
          Device ID <span className="text-[0.65rem] text-slate-500 normal-case">(MAC-based, e.g. C1D4D8)</span>
        </label>
        <input
          className={inputClass}
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          placeholder="C1D4D8"
          maxLength={32}
        />
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>Friendly Name</label>
        <input
          className={inputClass}
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          placeholder="Living Room Env Sensor"
          maxLength={64}
        />
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>Device Type</label>
        <select className={inputClass} value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
          {DEVICE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>Hardware Model</label>
        <input
          className={inputClass}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="esp32"
          maxLength={64}
        />
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>Hardware Version</label>
        <input
          className={inputClass}
          value={hardwareVersion}
          onChange={(e) => setHardwareVersion(e.target.value)}
          placeholder="v1"
          maxLength={32}
        />
      </div>
      <div className="mb-3.5">
        <label className={labelClass}>Room</label>
        <select className={inputClass} value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          <option value="">— None —</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.displayName ?? r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3.5 flex items-center gap-2.5">
        <input
          type="checkbox"
          id="f-has-ota"
          className="w-auto accent-sky-400"
          checked={hasOta}
          onChange={(e) => setHasOta(e.target.checked)}
        />
        <label htmlFor="f-has-ota" className="normal-case text-sm tracking-normal text-slate-300 cursor-pointer">
          Device has OTA firmware
        </label>
      </div>
      {error && <div className="text-red-400 text-[0.8rem] mt-2">{error}</div>}
      <div className="flex gap-2.5 mt-5">
        <button
          onClick={onClose}
          className="flex-1 bg-transparent border border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white py-2 rounded-lg text-sm transition"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-[2] bg-sky-400 hover:opacity-85 disabled:opacity-50 text-slate-900 font-bold py-2 rounded-lg text-sm transition"
        >
          {loading ? 'Adding…' : 'Add Device'}
        </button>
      </div>
    </Modal>
  )
}
