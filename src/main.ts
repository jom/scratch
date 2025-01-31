import { app, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent, Menu } from "electron"
import * as path from "path"
import * as fs from "fs"

let mainWindow: BrowserWindow | null = null
let currentFilePath: string | null = null
let isQuitting = false
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')
const USER_SETTINGS_PATH = path.join(app.getPath('userData'), 'user-settings.json')

interface UserSettings {
  theme: 'system' | 'light' | 'dark'
  previewEnabled: boolean
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  previewEnabled: false
}

// Load user settings
const loadUserSettings = (): UserSettings => {
  try {
    if (fs.existsSync(USER_SETTINGS_PATH)) {
      const settings = JSON.parse(fs.readFileSync(USER_SETTINGS_PATH, 'utf8'))
      return { ...DEFAULT_SETTINGS, ...settings }
    }
  } catch (error) {
    console.error('Error loading user settings:', error)
  }
  return DEFAULT_SETTINGS
}

// Save user settings
const saveUserSettings = (settings: UserSettings) => {
  try {
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings, null, 2))
    return true
  } catch (error) {
    console.error('Error saving user settings:', error)
    return false
  }
}

// Load last opened file path
const loadSettings = (): { lastOpenedFile: string | null } => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'))
    }
  } catch (error) {
    console.error('Error loading settings:', error)
  }
  return { lastOpenedFile: null }
}

// Save settings
const saveSettings = (settings: { lastOpenedFile: string | null }) => {
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings))
  } catch (error) {
    console.error('Error saving settings:', error)
  }
}

const createMenu = () => {
  const isMac = process.platform === 'darwin'
  
  const template = [
    // macOS Application menu
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Settings...',
          accelerator: 'Command+,',
          click: () => {
            mainWindow?.webContents.send('open-settings')
          }
        },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'Open...',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            handleOpenFile()
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            mainWindow?.webContents.send('save-file')
          }
        },
        { type: 'separator' },
        ...(isMac ? [] : [{ role: 'quit' }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste', accelerator: 'CmdOrCtrl+V' },
        { type: 'separator' },
        {
          label: 'Smart Paste',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            mainWindow?.webContents.send('smart-paste')
          }
        },
        {
          label: 'Plain Paste',
          accelerator: 'CmdOrCtrl+Alt+V',
          click: () => {
            mainWindow?.webContents.send('paste-plain')
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.send('toggle-command-palette')
          }
        },
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => {
            mainWindow?.webContents.send('toggle-preview')
          }
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      role: 'window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    }
  ]
  
  const menu = Menu.buildFromTemplate(template as any)
  Menu.setApplicationMenu(menu)
}

const handleOpenFile = async () => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return await openFile(result.filePaths[0])
  }
  return null
}

const openFile = async (filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf8')
    currentFilePath = filePath
    saveSettings({ lastOpenedFile: filePath })
    mainWindow?.webContents.send('file-opened', { content, filePath })
    return { content, filePath }
  } catch (error) {
    console.error('Error reading file:', error)
    return null
  }
}

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      spellcheck: true,
      sandbox: false // Required for clipboard access
    },
    backgroundColor: '#ffffff'
  })

  createMenu()

  // In development, load from Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // Load the index.html from the .vite directory in production
    mainWindow.loadFile(path.join(__dirname, "index.html"))
  }

  // Always open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // Load last opened file or show dialog
  mainWindow.webContents.on('did-finish-load', async () => {
    if (!mainWindow) return
    
    const settings = loadSettings()
    if (settings.lastOpenedFile && fs.existsSync(settings.lastOpenedFile)) {
      await openFile(settings.lastOpenedFile)
    } else {
      await handleOpenFile()
    }
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting && mainWindow && currentFilePath) {
      e.preventDefault()
      mainWindow.webContents.send('save-before-exit')
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// File handling IPC events
ipcMain.handle('open-file', handleOpenFile)

ipcMain.handle('get-settings', () => {
  return loadUserSettings()
})

ipcMain.handle('save-settings', async (_event: IpcMainInvokeEvent, settings: UserSettings) => {
  const success = saveUserSettings(settings)
  if (success) {
    mainWindow?.webContents.send('settings-updated', settings)
  }
  return success
})

ipcMain.handle('save-file', async (_event: IpcMainInvokeEvent, { content }: { content: string }) => {
  if (!mainWindow || !currentFilePath) return false

  try {
    await fs.promises.writeFile(currentFilePath, content)
    return { success: true, filePath: currentFilePath }
  } catch (error) {
    console.error('Error saving file:', error)
    return { success: false }
  }
})

ipcMain.handle('save-and-exit', async (_event: IpcMainInvokeEvent, { content }: { content: string }) => {
  if (currentFilePath) {
    try {
      await fs.promises.writeFile(currentFilePath, content)
    } catch (error) {
      console.error('Error saving file before exit:', error)
    }
  }
  isQuitting = true
  app.quit()
})

