# Data Storage Specification & JSON Schema Contract

This document specifies the file format, directory structure, and schema for the JSON data files. Any external tool, script, or companion extension can use this specification to safely read and write visualizer data without breaking interoperability.

---

## 1. Directory Structure & File Naming

All data is stored inside a dedicated folder at the root of the workspace. **Each source code file has its own individual JSON file.**

### 1.1 Directory Path
```text
<workspace-root>/external-vscode-extension/Visualizer/
```

### 1.2 File Naming Convention
Each JSON file is named using the exact filename of the source file followed by `.json`:
```text
<source-filename>.json
```

### 1.3 Directory Layout Example
```text
my-project/
├── src/
│   ├── app.js
│   └── utils.py
├── index.html
└── external-vscode-extension/
    └── Visualizer/
        ├── app.js.json           # Stores tags for src/app.js
        ├── utils.py.json         # Stores tags for src/utils.py
        └── index.html.json       # Stores tags for index.html
```

---

## 2. Top-Level JSON Document Structure

Each JSON file contains a single JSON object with the following top-level fields:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | Identifier of the data format. Always `"Auzy-Keyword-Marker"`. |
| `fileUri` | `string` | **Yes** | Absolute URI of the target source file (e.g. `"file:///c:/path/to/app.js"`). |
| `fileName` | `string` | **Yes** | Basename of the source file including extension (e.g. `"app.js"`). |
| `savedAt` | `string` | **Yes** | ISO 8601 UTC timestamp of when the file was written (e.g. `"2026-11-01T00:15:00.000Z"`). |
| `tags` | `Array<TagObject>` | **Yes** | List of all marked keyword tag objects for this file. |

---

## 3. Tag Object Schema

Every item in the `tags` array represents one marked token or region.

### 3.1 Field Definitions

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Yes** | Unique tag identifier (e.g. `"tag_1730419200000_a1b2c"`). |
| `word` | `string` | **Yes** | The actual text token in the source code. |
| `title` | `string` | No | Optional human-readable title or label. Defaults to `""`. |
| `range` | `RangeObject` | **Yes** | Coordinates of the keyword in the source file (0-indexed). |
| `category` | `string` | **Yes** | Tag category. Must be one of: `"variable"`, `"function"`, `"tut-tag"`, `"keyword"`. |
| `variableSubType` | `string` | Conditional | Required if `category` is `"variable"`. Must be one of: `"Input"`, `"Output"`, `"Default"`, `"Pin Value"`. |
| `defaultValues` | `Array<string>`| No | Array of default value strings if `variableSubType` is `"Default"`. |
| `description` | `string` | No | Optional user note or documentation text. Defaults to `""`. |
| `tutData` | `TutDataObject` | No | Tutorial canvas payload. Present when `category` is `"tut-tag"`. |

---

## 4. Sub-Object Schemas

### 4.1 `RangeObject`
All line and character coordinates are strictly **0-indexed**:

```typescript
interface RangeObject {
  startLine: number;       // Line number where the tag begins (0-indexed)
  startCharacter: number;  // Character column where the tag begins (0-indexed)
  endLine: number;         // Line number where the tag ends (0-indexed)
  endCharacter: number;    // Character column where the tag ends (0-indexed)
}
```

### 4.2 `TutDataObject`
Used when `category` is `"tut-tag"`. Contains freeform visual tutorial cards:

```typescript
interface TutDataObject {
  canvasElements: Array<CanvasElement>;
}

interface CanvasElement {
  type: "text" | "image" | "link" | "code";  // Element type
  x: number;                                 // Horizontal pixel offset on canvas
  y: number;                                 // Vertical pixel offset on canvas
  width: number;                             // Card width in pixels
  height: number;                            // Card height in pixels
  content: string;                           // Note text, image URL/Base64, link URL, or code
  title?: string;                            // Optional card title, link display text, or code title
  language?: string;                         // If type is "code": e.g. "javascript", "python", "html"
}
```

---

## 5. Complete JSON File Example

Below is a complete, valid sample of a `<filename>.json` file illustrating all tag types:

```json
{
  "name": "Auzy-Keyword-Marker",
  "fileUri": "file:///c:/Projects/demo/main.js",
  "fileName": "main.js",
  "savedAt": "2026-11-01T00:15:30.000Z",
  "tags": [
    {
      "id": "tag_1730419200001_x9y2z",
      "word": "userInput",
      "title": "Input Port Stream",
      "range": {
        "startLine": 4,
        "startCharacter": 6,
        "endLine": 4,
        "endCharacter": 15
      },
      "category": "variable",
      "variableSubType": "Input",
      "description": "Receives user request payload."
    },
    {
      "id": "tag_1730419200002_k8j3m",
      "word": "sanitizedResponse",
      "title": "Cleaned Output",
      "range": {
        "startLine": 12,
        "startCharacter": 10,
        "endLine": 12,
        "endCharacter": 27
      },
      "category": "variable",
      "variableSubType": "Output",
      "description": "Output variable wired into downstream services."
    },
    {
      "id": "tag_1730419200003_p7q4r",
      "word": "maxRetries",
      "title": "Retry Threshold",
      "range": {
        "startLine": 1,
        "startCharacter": 6,
        "endLine": 1,
        "endCharacter": 16
      },
      "category": "variable",
      "variableSubType": "Default",
      "defaultValues": ["3", "5", "10"],
      "description": "Default retry counts."
    },
    {
      "id": "tag_1730419200004_v5w6t",
      "word": "authenticate",
      "title": "Auth Handler",
      "range": {
        "startLine": 20,
        "startCharacter": 9,
        "endLine": 20,
        "endCharacter": 21
      },
      "category": "function",
      "description": "Validates session token before execution."
    },
    {
      "id": "tag_1730419200005_c3d7s",
      "word": "setupDatabase",
      "title": "Database Setup Guide",
      "range": {
        "startLine": 35,
        "startCharacter": 4,
        "endLine": 35,
        "endCharacter": 17
      },
      "category": "tut-tag",
      "tutData": {
        "canvasElements": [
          {
            "type": "text",
            "x": 40,
            "y": 40,
            "width": 240,
            "height": 110,
            "content": "Follow these steps to connect your PostgreSQL instance.",
            "title": ""
          },
          {
            "type": "code",
            "x": 320,
            "y": 40,
            "width": 340,
            "height": 180,
            "content": "const client = new Client({ connectionString });\nawait client.connect();",
            "title": "dbConnect.js",
            "language": "javascript"
          },
          {
            "type": "link",
            "x": 40,
            "y": 180,
            "width": 240,
            "height": 70,
            "content": "https://node-postgres.com",
            "title": "node-postgres Docs"
          }
        ]
      }
    },
    {
      "id": "tag_1730419200006_h2g8f",
      "word": "async",
      "title": "Async Modifier",
      "range": {
        "startLine": 20,
        "startCharacter": 0,
        "endLine": 20,
        "endCharacter": 5
      },
      "category": "keyword",
      "description": "Standard JS async keyword"
    }
  ]
}
```

---

## 6. Rules for Third-Party Reading & Writing

To ensure bidirectional compatibility when multiple extensions read and write to these files:

1. **Individual Files**: Never merge multiple source files into a single JSON file. Each source file must have its own separate `<filename>.json` in `external-vscode-extension/Visualizer/`.
2. **Preserve Unknown Fields**: If writing an updated JSON file, preserve all existing fields and properties even if your extension does not use them.
3. **Immutable Tag IDs**: Do not change a tag's `id` during edits or updates. Retaining the `id` ensures tags remain tracked across tools.
4. **0-Indexed Ranges**: Ensure all `range` coordinates (`startLine`, `startCharacter`, `endLine`, `endCharacter`) are zero-indexed numbers.
5. **Exact Category & Sub-type Values**:
   - `category` must strictly match one of: `"variable"`, `"function"`, `"tut-tag"`, `"keyword"`.
   - `variableSubType` must strictly match one of: `"Input"`, `"Output"`, `"Default"`, `"Pin Value"`.
6. **Valid UTF-8 & Formatted JSON**: Write files with UTF-8 encoding, formatted with 2 spaces indentation (`JSON.stringify(data, null, 2)`).

