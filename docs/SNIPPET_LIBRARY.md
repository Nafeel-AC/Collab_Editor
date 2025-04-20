# Code Snippet Library

The Code Snippet Library is a feature that allows users to save, organize, and reuse code snippets within collaborative rooms. This enhances productivity by providing quick access to commonly used code patterns, components, and utilities.

## Features

- **Save Code Snippets**: Store frequently used code patterns for quick access
- **Categorize Snippets**: Organize snippets by category for easy retrieval
- **Filter and Search**: Quickly find snippets by title, description, or content
- **Insert Into Editor**: Add snippets directly into your code with a single click
- **Room-Specific**: Snippets are tied to specific rooms, creating a shared library for all collaborators

## Using the Code Snippet Library

### Accessing the Library

1. Open a collaborative code room
2. Click the "Snippets" button in the editor toolbar (gold button with code icon)
3. The Code Snippet Library modal will appear

### Creating a New Snippet

1. Click the "New Snippet" button in the library sidebar
2. Fill in the form with the following information:
   - **Title**: A descriptive name for your snippet
   - **Description** (optional): A brief explanation of what the snippet does
   - **Language**: Select the programming language of the snippet
   - **Category**: Choose an appropriate category for organization
   - **Code**: Enter or paste your code
3. Click "Save Snippet" to add it to the library

### Finding Snippets

The library offers several ways to find snippets:

- **Categories**: Use the sidebar to filter snippets by category
- **Search**: Use the search bar to find snippets by title, description, or code content

### Using Snippets

1. Browse or search to find the snippet you need
2. Choose one of the following actions:
   - Click the "+" icon to insert the snippet at the current cursor position in the editor
   - Click the "Copy" icon to copy the snippet to your clipboard
   - Click the "Edit" icon to modify the snippet
   - Click the "Delete" icon to remove the snippet

### Editing Snippets

1. Find the snippet you want to edit
2. Click the "Edit" icon (pencil)
3. Make your changes in the edit form
4. Click "Update Snippet" to save your changes

## Best Practices

- **Use Descriptive Titles**: Clear titles make snippets easier to find
- **Add Helpful Descriptions**: Describe what the snippet does and how to use it
- **Organize by Category**: Proper categorization helps when the library grows
- **Keep Snippets Focused**: Each snippet should serve a specific purpose
- **Comment Your Code**: Add comments to explain complex parts of the snippet

## Technical Details

- Snippets are stored in MongoDB via the backend API
- All snippets are available to everyone in the same room
- Snippets are tied to the room ID and will not appear in other rooms
- The snippet library uses a black and gold theme to match the editor UI

## Supported Languages

The Code Snippet Library supports syntax highlighting for:

- JavaScript
- TypeScript
- HTML
- CSS
- JSX
- Python
- Java
- C
- C++

## Categories

Snippets can be organized into the following categories:

- General
- Functions
- Components
- Hooks
- Styles
- Utilities

## API Endpoints

The Code Snippet Library uses the following API endpoints:

- `GET /api/snippets/room/:roomId` - Get all snippets in a room
- `GET /api/snippets/:snippetId` - Get a specific snippet by ID
- `POST /api/snippets` - Create a new snippet
- `PUT /api/snippets/:snippetId` - Update an existing snippet
- `DELETE /api/snippets/:snippetId` - Delete a snippet
- `GET /api/snippets/search/:roomId` - Search snippets in a room 