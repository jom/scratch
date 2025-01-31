# Modern Markdown Editor

A modern, feature-rich Markdown editor built with Electron, React, and TypeScript. Features live preview, smart code paste detection, and theme support.

## Features

- 🎨 Modern UI with light/dark/system theme support
- 📝 Live Markdown preview with syntax highlighting
- 💡 Smart code paste detection and formatting
- 🔄 Auto-save functionality
- ⌨️ Command palette (⌘P)
- 📱 Responsive split-pane layout
- 🎯 Keyboard shortcuts for all operations
- 🛠️ Configurable settings

### Smart Paste Features
- Automatically detects pasted code
- Formats JSON with proper indentation
- Detects programming language
- Wraps code in appropriate Markdown blocks
- Toggle between smart (⌘V) and plain (⌘⇧V) paste

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/markdown-editor.git

# Navigate to the project directory
cd markdown-editor

# Install dependencies
pnpm install

# Start the development server
pnpm run dev
```

## Building

```bash
# Build the application
pnpm run build

# Package the application
pnpm run package
```

## Keyboard Shortcuts

- `⌘P` - Open command palette
- `⌘O` - Open file
- `⌘S` - Save file
- `⌘⇧P` - Toggle preview
- `⌘,` - Open settings
- `⌘V` - Smart paste (with code detection)
- `⌘⇧V` - Plain paste

## Development

The project uses:
- Electron for the desktop application
- React for the UI
- TypeScript for type safety
- Monaco Editor for the code editor
- Marked for Markdown rendering
- Highlight.js for syntax highlighting
- Tailwind CSS for styling

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see below for details:

```
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
``` 