# Project Requirements

Name = 'Auzy-Keyword-Marker'
We are developing a vs code extension that will help users to visualize their code easily. 
We need to create 2functionality on vs code.

The extension will have an icon on vs-code's bottom-horizontal Status Bar. The range tracking engine and persistence always run continuously in the background for any file containing tags. The Status Bar icon acts as a **Visual Visibility Toggle** (`Visible` vs `Hidden`):
- When `Visible`: Colored decorations, borders, and left-click wiring interactions are rendered on screen.
- When `Hidden`: The editor view remains clean and normal, but all tag ranges and live text continue updating silently in the background so they never fall behind or misalign.

### Working of the extension
* When I select a keyword and mark it, its background color is applied and its range/metadata is stored in memory.
* As you type or edit the document, the ranges and live text of marked keywords are continuously updated in real-time (even while decorations are hidden).
* When I delete the text of a tag, it is automatically removed from memory.
* If I place my cursor at the end of the marked keyword and hit space it should never expand and stays the same.
* When I select an already marked tag and mark it again, the older mark will be automatically removed and replaced by the newer mark.

The main requirement of this project is that the extension will give me multiple features based on the type of keyword when I left-click on it after marking. A marked keyword will be called a tag.

1. For Input variable tag: Styled with a faded empty-slot appearance (faint dashed border) to indicate it is waiting for an incoming value. When I left-click on it, it will be armed / bound (selected). Then, if I click on an Output tag or a Default tag, the entire Input variable tag will be completely replaced by the clicked tag—replacing the text, the tag category/sub-type, the visual background color and border (switching to Green for Output, or Orange for Default), and all metadata (title, description, default values).
If you have clicked on an Input tag to arm it but do not want to replace it, clicking anywhere else in the editor will cancel the binding.
2. For Tut-Tag, when I left-click on a Tut-Tag a tutorial will open which I have created while marking the keyword.
3. For Default variable tag: Styled with a vibrant Orange background color. When I left-click on it (when no Input tag is armed), it opens a dropdown displaying its configured default values, allowing quick selection to apply any default value directly into the code. When an Input tag is armed, clicking a Default tag wires and replaces the Input tag with that Default tag.
You can right-click on the marked keyword and select 'Unmark'.


## Usage 

1. When I select a keyword in vs-code and right-click on it I will see an option 'Mark the keyword'.
2. I can mark the keyword as a Variable, Function, Tut-Tag, Keyword. There will be a JS-object for every file which will be maintained which will store range of the marked keyword and its other informations. When I hit ctrl+s the whole JS-object for that file will be saved inside a json file in 'external-vscode-extension/Visualizer' directory inside current directory.
3. The Keyword-Marker extension will have an icon on vs-code's lower horizontal 'Activity Bar'. When I open a file in vs-code it opens normally and if I click the Keyword-Marker icon the extension will be activated for the current file only.
4. I can activate the extension for multiple files by opening the file in vs-code and clicking the extension icon.
5. If I close the editor without hiting ctrl+s no json will be saved.

6. When I select a keyword and hit 'Mark the keyword' a dialogue box appears on top of the editor with dropdown for 'Variable', 'Function', 'Tut-Tag', 'Keyword'.
7. When you select from any of the options you get additional fields to fill:
- **Title (Optional)**: Can be provided for all marked keywords. Stored in JSON along with other metadata.
- **Description (Optional)**: Text note explaining the tag.

`Variable` 
```
1.  Dropdown for variable type 'Input', 'Output', 'Default', 'Pin Value'
2. Textarea for Description
3. If 'Default' type is selected then well get a '+' icon clicking on which we can add default values for the variable
4. If a keyword is marked as input variable it will have a feature. When you are done with all the keyword marking you can select an Input keyword which will then be binded, you can then select an output keyword to replace the input keyword with the output keyword. Both the text and the background stylling.
```
`Function` 
```
1. Just a Textarea for Description
```
`Tut-Tag`
```
These are tutorial tag. If a keyword is marked as a tut-tag you can click left-click on that keyword and see the created tutorial.
1. When you select Tut-Tag from the dropdown you get a canvas. You can use the top toolbar options to add widgets (Notes, Code, Images, Links). Clicking on the canvas background does not add accidental widgets.
2. All canvas elements (Notes, Images, Links, and Code Snippets) are freely draggable and resizable by clicking and dragging their bottom-right resize corner.
3. Code Snippet Widget: Authors can insert code snippets styled as a colorful code editor (macOS/IDE dots, language badges, monospace typography, and syntax highlighting).
4. This will be shown as a read-only tutorial when someone left-clicks on the Tut-Tag.
```

---

## 3. Critical Reliability & Testing Requirements

Because this extension is utilized in active coding and development workflows, **zero-regression reliability is critical**. The system must be covered by automated test suites:

### 3.1 Range Tracking Engine Tests (Unit Tests)
- **Edit Offsets**: Edits before a tag shift its start/end offsets accurately.
- **Internal Edits**: Edits inside a tag expand or contract the tag bounds without corrupting neighboring tags.
- **Boundary Space Invariance**: Adding spaces or characters immediately adjacent to the trailing boundary must NOT expand the tag.
- **Deletion Collapse**: Deleting the text containing a tag must collapse the range and trigger automatic tag deletion from memory.

### 3.2 Variable Wiring State Machine Tests
- **Arming Transition**: Left-clicking an Input tag transitions state to `ARMED` with the correct tag reference.
- **Replacement Execution**: Clicking an Output tag while an Input tag is `ARMED` successfully initiates text and style replacement on the target Input tag, and clears `ARMED` state.
- **Cancellation**: Clicking on neutral whitespace or another non-output token while `ARMED` cancels the armed state cleanly without mutating text.

### 3.3 Persistence & Schema Validation Tests
- **JSON Serialization**: Verify that the schema written to `external-vscode-extension/Visualizer/<filename>.json` contains all required fields (`id`, `word`, `range`, `category`, `variableSubType`, etc.).
- **Save Event Isolation**: Verifying that edits without `Ctrl+S` do NOT write to disk, and file close without save discards unsaved state.


