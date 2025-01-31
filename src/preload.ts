import { contextBridge, ipcRenderer, IpcRendererEvent, clipboard } from 'electron'

// Expose all functionality through a single electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: async () => {
    return await ipcRenderer.invoke('open-file')
  },
  saveFile: async (content: string) => {
    return await ipcRenderer.invoke('save-file', { content })
  },
  saveAndExit: async (content: string) => {
    return await ipcRenderer.invoke('save-and-exit', { content })
  },
  // Settings
  getSettings: async () => {
    return await ipcRenderer.invoke('get-settings')
  },
  saveSettings: async (settings: unknown) => {
    return await ipcRenderer.invoke('save-settings', settings)
  },
  // IPC communication
  send: (channel: string, data: unknown) => {
    const validChannels = ['content-response']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  // Clipboard operations
  clipboard: {
    readText: () => {
      try {
        return clipboard.readText()
      } catch (error) {
        console.error('Error reading from clipboard:', error)
        return ''
      }
    },
    writeText: (text: string) => {
      try {
        clipboard.writeText(text)
        return true
      } catch (error) {
        console.error('Error writing to clipboard:', error)
        return false
      }
    }
  }
})

// Event listeners
ipcRenderer.on('file-opened', (_event: IpcRendererEvent, { content, filePath }: { content: string; filePath: string }) => {
  window.dispatchEvent(new CustomEvent('markdown-file-opened', {
    detail: { content, filePath }
  }))
})

ipcRenderer.on('save-before-exit', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('save-before-exit'))
})

ipcRenderer.on('request-content', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('request-content'))
})

ipcRenderer.on('toggle-command-palette', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('toggle-command-palette'))
})

ipcRenderer.on('toggle-preview', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('toggle-preview'))
})

ipcRenderer.on('toggle-settings', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('toggle-settings'))
})

ipcRenderer.on('smart-paste', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('smart-paste'))
})

ipcRenderer.on('paste-plain', (_event: IpcRendererEvent) => {
  window.dispatchEvent(new Event('paste-plain'))
})

ipcRenderer.on('open-settings', () => {
  window.dispatchEvent(new CustomEvent('open-settings'))
})

ipcRenderer.on('settings-updated', (_event, settings) => {
  window.dispatchEvent(new CustomEvent('settings-updated', { detail: settings }))
}) 