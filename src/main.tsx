import React from 'react'
import ReactDOM from 'react-dom/client'
import Root from './Root'
import ThemeToggle from './ThemeToggle'
import './index.css'

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <Root />
    <ThemeToggle />
  </React.StrictMode>
)
