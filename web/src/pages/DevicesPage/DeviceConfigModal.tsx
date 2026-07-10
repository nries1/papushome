import { useState } from 'react'

import { useMutation } from '@redwoodjs/web'

import Modal from 'src/components/Modal/Modal'

import { UPDATE_DEVICE_CONFIG_MUTATION } from './queries'
import type { DeviceWithStatus } from './types'

const inputClass =
  'w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg text-sm box-border'
const labelClass = 'block text-xs uppercase tracking-wide text-slate-400 mb-1.5'

export default function DeviceConfigModal({
  device,
  onClose,
  onSaved,
}: {
  device: DeviceWithStatus
  onClose: () => void
  onSaved: () => void
}) {
  const [capacity, setCapacity] = useState(String(device.config?.tank_capacity_gallons ?? 30))
  const [calibGallonsInput, setCalibGallonsInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const hasExistingCalibration = Boolean(device.config?.calibration_raw && device.config?.calibration_gallons)
  const [calibrationCleared, setCalibrationCleared] = useState(false)
  const existingCalibVisible = hasExistingCalibration && !calibrationCleared

  const tank = device.latestTankReading

  const [updateDeviceConfig, { loading }] = useMutation(UPDATE_DEVICE_CONFIG_MUTATION, {
    onCompleted: () => {
      onSaved()
      onClose()
    },
    onError: (err) => setError(err.message),
  })

  const handleSave = () => {
    setError(null)

    const capacityNum = parseFloat(capacity)
    if (!capacityNum || capacityNum <= 0) {
      setError('Enter a valid tank capacity.')
      return
    }

    const patch: Record<string, number | null> = { tank_capacity_gallons: capacityNum }

    if (tank && calibGallonsInput.trim() !== '') {
      const calibGallons = parseFloat(calibGallonsInput)
      if (isNaN(calibGallons) || calibGallons < 0) {
        setError('Enter a valid number of gallons for calibration.')
        return
      }
      if (calibGallons > capacityNum) {
        setError('Calibration gallons cannot exceed tank capacity.')
        return
      }
      patch.calibration_raw = tank.rawValue
      patch.calibration_gallons = calibGallons
    } else if (!existingCalibVisible && hasExistingCalibration) {
      // user cleared the existing calibration
      patch.calibration_raw = null
      patch.calibration_gallons = null
    }

    updateDeviceConfig({ variables: { deviceId: device.deviceId, patch } })
  }

  return (
    <Modal title="Device Settings" onClose={onClose}>
      <div className="mb-3.5">
        <label className={labelClass}>Tank Capacity (gallons)</label>
        <input
          type="number"
          min={1}
          max={10000}
          step={0.5}
          className={inputClass}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          placeholder="30"
        />
      </div>

      <div className="border-t border-slate-700 my-4" />
      <div className="text-xs uppercase tracking-wide text-slate-400 mb-2.5">Sensor Calibration</div>

      {!tank ? (
        <div className="text-[0.8rem] text-slate-400 mb-2.5">
          No sensor reading yet — send one reading first, then calibrate.
        </div>
      ) : (
        <>
          <div className="text-[0.8rem] text-slate-400 mb-2.5">
            Place the sensor in the tank, then enter how many gallons are currently in it. The system will use this
            as the calibration reference.
          </div>
          <div className="mb-3.5">
            <label className={labelClass}>
              Current gallons in tank <span className="font-normal normal-case tracking-normal">(raw={tank.rawValue})</span>
            </label>
            <input
              type="number"
              min={0}
              step={0.1}
              className={inputClass}
              value={calibGallonsInput}
              onChange={(e) => setCalibGallonsInput(e.target.value)}
              placeholder="e.g. 7"
            />
          </div>
          {existingCalibVisible && (
            <div className="text-[0.75rem] text-slate-400 -mt-1.5 mb-2.5">
              Current calibration: {device.config?.calibration_gallons} gal at raw={device.config?.calibration_raw} —{' '}
              <button onClick={() => setCalibrationCleared(true)} className="bg-transparent border-none text-red-400 text-[0.75rem] p-0 cursor-pointer">
                Clear
              </button>
            </div>
          )}
        </>
      )}

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
          {loading ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Modal>
  )
}
