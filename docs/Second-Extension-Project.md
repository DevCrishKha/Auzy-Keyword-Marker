I want to create another extension for vs-code.

The extension will read for any marker comments in the code.
There will be starting & ending marker comments in my code <{<< Component-1 >>}>  </{<< Component-1 >>}>

The extension will read the marker comments and will render a component in a node-editor inside vs-code. It will open the node-editor just like a new file in vs-code when I click on its icon on the status bar.

The node-editor will also have a pallete for some common components. A component will be nothing but some lines of code underneath. If I slide a component from the pallete into the node-editor then the lines of code will be appended in my code file with the starting & ending market comments. Every language will have its own pallete and I will first select a folder location for that language from where the components will come from.

Example working:
When I select a folder location for JS every JS file in that folder will be looked and every code inside a starting & ending marker comments as explained above will be stored as components inside the pallete. 

Will the components in the pallete be consistent ?
No. The extension will maintain a json file inside 'external-vscode-extension/Visualizer/' where it will store the folders for all the languages from where it will get the components. The components will be scaffolded each time from those folder into the component pallete, I must also have a refresh button on the pallete.
I'll need a UI to add & remove folders containing components for each language.

How the components will look ?
The component will be square in shape and will be big if it contains a lot of code inside and will be small if it contains less code with a maximum & minimum size for a component. So I can be able to understand the size of code written inside that component. (The size can also be due to the number of tags you have to display on the components (Explained below)) 

The component will read the json file created by the current Keyword-Marker extension and will show some fields for plug & play development tasks. For example the Input tag will show in this format, with the Title giving a describing what the Input value does and a Question-mark icon to click and read the title & description of the Input Tag.
⭕ < The text in Input Tag > ? 
I can write any value in place of this Input Tag text and the text will be replaced in the code. But the replaced text will still be an input tag until unmarked or wired to an output variable. And the purpose of this '⭕' is explained below. 

***The two extensions will be working with each other and reads & writes to the json files so I must hit ctrl+s whenever I use any extension cause they do not transfer data through memory***

The component will not just show Input tag but also Output, Default & Tut-Tags

How Output Tag will show:
```
`<Title of Output Tag>` < The text in output tag > ? ⭕

Where ? is the question-mark icon to click and read the title & description & ⭕ is a hollow dot clicking on which I can take out a cord which I can then put into the input of another component or the same component to Wire the input and output together.
```

How Default Tag will show:
```
< The text in Default tag > ↓ ? ⭕
Where ↓ is the button to click for the dropdown default options, ? is the question-mark icon to click and read the title & description & ⭕ is a hollow dot using which I can bind this Default tag to an input tag.
```

How Tut-Tag will show:
```
<Tut-tag text> ?
The Tut-Tag will not show its title, when you click on the highlighted text the tutorial will show and if you click on the question-mark icon the Title & Discription will show.
```

**The text of each tag will with the same background color as its shown in the editor after marking**
**Try to place the tags on the component depending their relative position in the code. Checking the range of each tag.**
**For example: If a Tut-Tag is in the same line with an Output Tag then they both will show in the same line on the node-component. The node component will not have visible lines but the tags must loop on their relative positions as in the code. Also create an algorithm if there is a lot of spaces or lines withuot any tag then after a certain point those spaces & lines will be neglected so the tags don't go too far on the node-component. I don't want to scroll on the node-component if there are a lot of tags they will be shown on top of the component at the same time (Have a room to change this feature later on if not liked)**
**When I take a component from the pallete that the extension derived from another folder, as soon as I drag and bring the component to the canvas of node-editor the code will be added to my code file and its tags will be added to the tags json file for that code-file (Clarify if you have any doubt)**

***I want this to be a node-editor like node-RED but with more power. You can create components very easily and you can add your current folder as a folder to scaffold components from. You can then drag a component from the the pallete into the node-editor canvas and required changes will be added to your code. Even kids can do programming and create projects using this.***