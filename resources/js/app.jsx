import { createRoot } from 'react-dom/client'
import Landing from './Landing'

// Self-hosted variable fonts. No render-blocking Google Fonts link.
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import '../css/app.css'

createRoot(document.getElementById('root')).render(<Landing />)
