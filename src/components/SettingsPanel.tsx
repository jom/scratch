import React, { useEffect, useState } from 'react'
import { UserSettings } from '../types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<UserSettings>({
    theme: 'system',
    isPreviewCollapsed: true
  })

  useEffect(() => {
    const loadSettings = async () => {
      const savedSettings = await window.electronAPI.getSettings()
      setSettings(savedSettings)
    }
    
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  const handleThemeChange = async (theme: UserSettings['theme']) => {
    const newSettings = { ...settings, theme }
    setSettings(newSettings)
    const success = await window.electronAPI.saveSettings(newSettings)
    if (success) {
      // Dispatch settings update event
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: newSettings }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold dark:text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => handleThemeChange(e.target.value as UserSettings['theme'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
} 