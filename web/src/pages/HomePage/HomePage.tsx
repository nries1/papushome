import { Link, routes } from '@redwoodjs/router'
import { Metadata } from '@redwoodjs/web'

const NAV_ITEMS = [
  { to: routes.devices(), label: 'Devices', description: 'Sensors, pumps, and displays' },
  { to: routes.plantCare(), label: 'Plant Care', description: 'Watering, moisture, and tank levels' },
  { to: routes.photoGallery(), label: 'Photo Gallery', description: 'Family photos and reactions' },
  { to: routes.homeKnowledge(), label: 'Home Knowledge', description: "Papu's memory" },
  { to: routes.robot(), label: 'Robot', description: 'Vision, voice, and chat' },
  { to: routes.systemHealth(), label: 'System Health', description: 'Service status and diagnostics' },
]

const HomePage = () => {
  return (
    <>
      <Metadata title="Home" description="Papu Home dashboard" />

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-extrabold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
          Papu Home
        </h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="bg-slate-800/50 border border-slate-700 hover:border-blue-400 rounded-2xl p-5 transition"
            >
              <div className="text-lg font-bold text-white">{item.label}</div>
              <div className="text-sm text-slate-400 mt-1">{item.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

export default HomePage
