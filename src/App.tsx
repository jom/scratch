import React, { useState, useEffect, useRef } from 'react'
import Editor, { Monaco } from '@monaco-editor/react'
import { marked } from 'marked'
import hljs from 'highlight.js'
import Split from 'split.js'
import 'highlight.js/styles/github.css'
import './styles/markdown.css'
import { CommandPalette } from './components/CommandPalette'
import { SettingsPanel } from './components/SettingsPanel'
import { UserSettings } from './types'

// Type definitions for our electron API
declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<{ content: string; filePath: string } | null>
      saveFile: (content: string) => Promise<{ success: boolean; filePath?: string }>
      saveAndExit: (content: string) => Promise<void>
      getSettings: () => Promise<{
        theme: 'system' | 'light' | 'dark'
        isPreviewCollapsed: boolean
        splitSizes?: [number, number]
      }>
      saveSettings: (settings: unknown) => Promise<boolean>
      clipboard: {
        readText: () => string
        writeText: (text: string) => void
      }
      send: (channel: string, data: unknown) => void
      onOpenSettings: () => void
    }
  }
}

interface FileOpenedEvent extends CustomEvent {
  detail: {
    content: string
    filePath: string
  }
}

const AUTOSAVE_INTERVAL = 30000 // 30 seconds

const App: React.FC = () => {
  const [markdown, setMarkdown] = useState('')
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>()
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system')
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false)
  const [splitSizes, setSplitSizes] = useState<[number, number]>([50, 50])
  const [markedRenderer] = useState(() => {
    const renderer = new marked.Renderer()

    renderer.code = (code: string, infostring: string | undefined, _escaped: boolean) => {
      const lang = (infostring || '').match(/\S*/)?.[0] || ''
      let highlighted = code
      if (lang && hljs.getLanguage(lang)) {
        try {
          highlighted = hljs.highlight(code, { language: lang }).value
        } catch (err) {
          console.error(err)
        }
      }
      
      // Escape the code for the data attribute to prevent HTML issues
      const escapedCode = code.replace(/"/g, '&quot;')
      
      // Don't use marked.parseInline for code blocks to prevent backticks
      return `<pre><code class="language-${lang}">${highlighted}<button class="copy-button" data-code="${escapedCode}"><span>Copy</span></button></code></pre>`
    }

    // Prevent backticks in inline code
    renderer.codespan = (code: string) => {
      return `<code>${code}</code>`
    }

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true
    })

    return renderer
  })
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const splitInstance = useRef<Split.Instance | null>(null)

  const handleEditorChange = (value: string | undefined) => {
    setMarkdown(value || '')
  }

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  const detectLanguage = (content: string): string => {
    // Try to detect if it's JSON
    try {
      JSON.parse(content)
      return 'json'
    } catch {}

    // Try to detect language using highlight.js
    const result = hljs.highlightAuto(content)
    if (result.language && result.relevance > 5) {
      return result.language
    }

    // Default to plain text
    return 'text'
  }

  const formatCode = (code: string, language: string): string => {
    if (language === 'json') {
      try {
        return JSON.stringify(JSON.parse(code), null, 2)
      } catch {}
    }
    return code
  }

  const handleSmartPaste = async () => {
    try {
      const text = window.electronAPI.clipboard.readText()
      if (!text || !editorRef.current) return

      const language = detectLanguage(text)
      const formattedCode = formatCode(text, language)
      
      const editor = editorRef.current
      const model = editor.getModel()
      const selection = editor.getSelection()
      
      if (model && selection) {
        const codeBlock = `\`\`\`${language}\n${formattedCode}\n\`\`\`\n`
        editor.executeEdits('smart-paste', [{
          range: selection,
          text: codeBlock,
        }])
        editor.pushUndoStop()
      }
    } catch (error) {
      console.error('Error during smart paste:', error)
    }
  }

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const settings = await window.electronAPI.getSettings()
      setTheme(settings.theme)
      setIsPreviewCollapsed(settings.isPreviewCollapsed)
      if (settings.splitSizes) {
        setSplitSizes(settings.splitSizes)
      }
    }
    loadSettings()
  }, [])

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const activeTheme = theme === 'system' ? systemTheme : theme
    
    // Remove both classes first
    root.classList.remove('dark', 'light')
    // Add the active theme class
    root.classList.add(activeTheme)
    
    // Update Monaco editor theme
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(activeTheme === 'dark' ? 'vs-dark' : 'vs-light')
    }
  }, [theme])

  // Handle paste events
  useEffect(() => {
    const handleSmartPasteEvent = () => {
      handleSmartPaste()
    }

    const handlePlainPaste = () => {
      try {
        const text = window.electronAPI.clipboard.readText()
        if (!text || !editorRef.current) return

        const editor = editorRef.current
        const model = editor.getModel()
        const selection = editor.getSelection()
        
        if (model && selection) {
          editor.executeEdits('plain-paste', [{
            range: selection,
            text: text,
          }])
          editor.pushUndoStop()
        }
      } catch (error) {
        console.error('Error during plain paste:', error)
      }
    }

    // Listen for both menu events and keyboard shortcuts
    window.addEventListener('smart-paste', handleSmartPasteEvent)
    window.addEventListener('paste-plain', handlePlainPaste)

    // Handle direct paste event
    const handlePaste = (e: ClipboardEvent) => {
      if (!editorRef.current) return
      
      // Check if the editor has focus
      if (document.activeElement?.closest('.monaco-editor')) {
        e.preventDefault()
        // Use clipboard data from the event instead of the API
        const text = e.clipboardData?.getData('text')
        if (!text) return

        const editor = editorRef.current
        const model = editor.getModel()
        const selection = editor.getSelection()
        
        if (model && selection) {
          const language = detectLanguage(text)
          const formattedCode = formatCode(text, language)
          const codeBlock = `\`\`\`${language}\n${formattedCode}\n\`\`\`\n`
          
          editor.executeEdits('smart-paste', [{
            range: selection,
            text: codeBlock,
          }])
          editor.pushUndoStop()
        }
      }
    }

    document.addEventListener('paste', handlePaste)

    return () => {
      window.removeEventListener('smart-paste', handleSmartPasteEvent)
      window.removeEventListener('paste-plain', handlePlainPaste)
      document.removeEventListener('paste', handlePaste)
    }
  }, [])

  // Auto-save periodically
  useEffect(() => {
    if (!markdown || !currentFilePath) return

    const saveContent = async () => {
      await window.electronAPI.saveFile(markdown)
    }

    const intervalId = setInterval(saveContent, AUTOSAVE_INTERVAL)

    return () => clearInterval(intervalId)
  }, [markdown, currentFilePath])

  // Handle save before exit
  useEffect(() => {
    const handleSaveBeforeExit = async () => {
      await window.electronAPI.saveAndExit(markdown)
    }

    window.addEventListener('save-before-exit', handleSaveBeforeExit)

    return () => {
      window.removeEventListener('save-before-exit', handleSaveBeforeExit)
    }
  }, [markdown])

  // Handle content request
  useEffect(() => {
    const handleContentRequest = () => {
      window.electronAPI.send('content-response', markdown)
    }

    window.addEventListener('request-content', handleContentRequest)

    return () => {
      window.removeEventListener('request-content', handleContentRequest)
    }
  }, [markdown])

  // Handle command palette toggle
  useEffect(() => {
    const handleCommandPaletteToggle = () => {
      setIsCommandPaletteOpen(prev => !prev)
    }

    window.addEventListener('toggle-command-palette', handleCommandPaletteToggle)

    return () => {
      window.removeEventListener('toggle-command-palette', handleCommandPaletteToggle)
    }
  }, [])

  // Handle settings toggle
  useEffect(() => {
    const handleSettingsToggle = () => {
      setIsSettingsOpen(prev => !prev)
    }

    window.addEventListener('toggle-settings', handleSettingsToggle)

    return () => {
      window.removeEventListener('toggle-settings', handleSettingsToggle)
    }
  }, [])

  // Handle preview toggle
  useEffect(() => {
    const handlePreviewToggle = () => {
      setIsPreviewCollapsed(prev => !prev)
    }

    window.addEventListener('toggle-preview', handlePreviewToggle)

    return () => {
      window.removeEventListener('toggle-preview', handlePreviewToggle)
    }
  }, [])

  useEffect(() => {
    const handleFileOpened = (e: FileOpenedEvent) => {
      const { content, filePath } = e.detail
      setMarkdown(content)
      setCurrentFilePath(filePath)
    }

    window.addEventListener('markdown-file-opened', handleFileOpened as EventListener)

    return () => {
      window.removeEventListener('markdown-file-opened', handleFileOpened as EventListener)
    }
  }, [])

  // Add click handler for copy buttons
  useEffect(() => {
    const handleCopyClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('copy-button')) {
        const code = target.getAttribute('data-code')
        if (code) {
          try {
            // Unescape the HTML entities
            const decodedCode = code.replace(/&quot;/g, '"')
            await window.electronAPI.clipboard.writeText(decodedCode)
            target.textContent = '✓'
            target.classList.add('copied')
            setTimeout(() => {
              target.textContent = 'Copy'
              target.classList.remove('copied')
            }, 2000)
          } catch (error) {
            console.error('Error copying to clipboard:', error)
          }
        }
      }
    }

    document.addEventListener('click', handleCopyClick)
    return () => document.removeEventListener('click', handleCopyClick)
  }, [])

  // Handle settings open event
  useEffect(() => {
    const handleSettingsOpen = () => {
      setIsSettingsOpen(true)
    }

    window.addEventListener('open-settings', handleSettingsOpen)
    return () => {
      window.removeEventListener('open-settings', handleSettingsOpen)
    }
  }, [])

  // Remove the duplicate toggle-settings event listener since we're using open-settings
  useEffect(() => {
    const handleSettingsUpdate = (e: CustomEvent<UserSettings>) => {
      if (e.detail.theme) {
        setTheme(e.detail.theme)
      }
      setIsPreviewCollapsed(e.detail.isPreviewCollapsed)
    }

    window.addEventListener('settings-updated', handleSettingsUpdate as EventListener)

    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate as EventListener)
    }
  }, [])

  const commands = [
    {
      id: 'toggle-preview',
      title: 'Toggle Preview',
      action: () => {
        setIsPreviewCollapsed(prev => !prev)
      },
      shortcut: '⌘⇧P'
    },
    {
      id: 'settings',
      title: 'Open Settings',
      action: () => setIsSettingsOpen(true),
      shortcut: '⌘,'
    },
    {
      id: 'smart-paste',
      title: 'Smart Paste',
      action: handleSmartPaste,
      shortcut: '⌘V'
    }
  ]

  const handlePreviewResize = async (sizes: number[]) => {
    const previewSize = sizes[1]
    if (previewSize < 10 && !isPreviewCollapsed) {
      setIsPreviewCollapsed(true)
      const settings = await window.electronAPI.getSettings()
      await window.electronAPI.saveSettings({
        ...settings,
        isPreviewCollapsed: true
      })
    } else if (previewSize >= 10 && isPreviewCollapsed) {
      setIsPreviewCollapsed(false)
      const settings = await window.electronAPI.getSettings()
      await window.electronAPI.saveSettings({
        ...settings,
        isPreviewCollapsed: false
      })
    }
    
    // Only save non-collapsed sizes
    if (!isPreviewCollapsed && previewSize >= 10) {
      setSplitSizes([sizes[0], sizes[1]])
      const settings = await window.electronAPI.getSettings()
      await window.electronAPI.saveSettings({
        ...settings,
        splitSizes: [sizes[0], sizes[1]]
      })
    }
  }

  const togglePreview = async () => {
    const newState = !isPreviewCollapsed
    setIsPreviewCollapsed(newState)
    const settings = await window.electronAPI.getSettings()
    await window.electronAPI.saveSettings({
      ...settings,
      isPreviewCollapsed: newState
    })
  }

  // Initialize split.js
  useEffect(() => {
    if (!splitInstance.current) {
      splitInstance.current = Split(['.editor-container', '.preview-container'], {
        sizes: isPreviewCollapsed ? [99, 1] : splitSizes,
        minSize: isPreviewCollapsed ? 24 : 50,
        gutterSize: 4,
        onDragEnd: handlePreviewResize
      })
    }

    return () => {
      if (splitInstance.current) {
        splitInstance.current.destroy()
        splitInstance.current = null
      }
    }
  }, [])

  // Update split sizes when preview is toggled
  useEffect(() => {
    if (splitInstance.current) {
      splitInstance.current.setSizes(isPreviewCollapsed ? [99, 1] : splitSizes)
    }
  }, [isPreviewCollapsed, splitSizes])

  return (
    <div className="h-screen flex flex-col bg-white dark:bg-gray-900">
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex">
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={markdown}
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme={theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'vs-dark' : 'vs-light'}
              options={{
                wordWrap: 'on',
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 10 },
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                  useShadows: false
                }
              }}
            />
          </div>
          <div className={`preview-container ${isPreviewCollapsed ? 'collapsed' : ''}`}>
            <button 
              className="preview-toggle"
              onClick={togglePreview}
              title={isPreviewCollapsed ? "Expand preview" : "Collapse preview"}
            >
              ›
            </button>
            <div className="preview-content">
              <div
                className="prose dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: marked.parse(markdown, {
                  renderer: markedRenderer,
                  gfm: true,
                  breaks: true,
                  mangle: false,
                  headerIds: false
                }) }}
              />
            </div>
          </div>
        </div>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  )
}

export default App 