import { useState } from 'react'
import CellularAutomataIntro from './components/CellularAutomataIntro'
import Site from './components/Site'

export default function App() {
  const [introComplete, setIntroComplete] = useState(false)

  return (
    <>
      {!introComplete && (
        <CellularAutomataIntro onComplete={() => setIntroComplete(true)} />
      )}
      <div
        className={`transition-opacity duration-1000 ${
          introComplete ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Site />
      </div>
    </>
  )
}
