```
Creator: Dev Crish Kha | 01-11-2026
```

# Auzy-Keyword-Marker (VS Code Extension)

Interactive code visualizer, variable wiring, and in-editor tutorial authoring tool.

---

## Features
- **Context Menu Trigger**: Select any word, right-click, and choose **"Mark the keyword"**.
- **Interactive Unified Form**: Select category (`Variable`, `Function`, `Tut-Tag`, `Keyword`), sub-types, title, and description all at once.
- **Variable Wiring**: Left-click an Input variable to arm it, then click an Output variable to wire and replace text & styling.
- **Tut-Tag Canvas**: Freeform authoring with resizable notes, images, links, and colorful code editor widgets.
- **Real-Time Range Tracking**: Background engine ensures highlights never fall behind live text edits.
- **Persistence**: Automatically syncs tags to JSON files on `Ctrl+S`.

---

## Documentation
Complete engineering and architecture documentation is available in the [`docs/`](./docs/README.md) directory:
- [Requirements](./docs/Requirements.md)
- [Requirements & Architecture](./docs/requirements-and-architecture.md)
- [Code & Functions Map](./docs/code-and-functions-map.md)
- [Data Storage & JSON Contract](./docs/data-storage-specification.md)
- [Pitfalls & Gotchas](./docs/pitfalls-and-gotchas.md)
- [Development Rules](./docs/DEVELOPMENT-RULES.md)

---

## Install in VS-Code and use
1. Download the main branch
2. cd inside the downloaded folder Auzy-Keyword-Marker
3. Copy the path from inside the folder
4. Run this command

`Windows Powershell:` 
``` 
cmd /c mklink /J "$env:USERPROFILE\.vscode\extensions\auzy-keyword-marker" "< Your_Copied_Path >" 
```

`Ubuntu/Debian Terminal:`
```
ln -s "<Your_Copied_Path>" ~/.vscode/extensions/auzy-keyword-marker
```