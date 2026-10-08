import { createRoot } from 'react-dom/client'
import Landing from './Landing'

// Self-hosted variable fonts. No render-blocking Google Fonts link.
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/rethink-sans'

import './App.css'

createRoot(document.getElementById('root')).render(<Landing />)
