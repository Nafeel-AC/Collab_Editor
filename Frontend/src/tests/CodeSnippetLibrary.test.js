import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CodeSnippetLibrary from '../components/CodeSnippetLibrary';

// Mock fetch globally
global.fetch = jest.fn();

// Mock components from framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    aside: ({ children, ...props }) => <aside {...props}>{children}</aside>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Setup mock data
const mockSnippets = [
  {
    id: '1',
    title: 'React Component',
    description: 'Basic React component template',
    code: 'function Component() { return <div>Hello</div>; }',
    language: 'jsx',
    category: 'components',
    createdBy: { userName: 'testUser' },
    createdAt: new Date().toISOString(),
  }
];

describe('CodeSnippetLibrary Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    // Mock successful fetch response with mock data
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnippets,
    });
  });

  it('should render the snippet library when open', async () => {
    render(
      <CodeSnippetLibrary
        isOpen={true}
        onClose={() => {}}
        token="test-token"
        roomId="test-room"
        onInsertSnippet={() => {}}
      />
    );

    // Check for library title
    expect(screen.getByText('Code Snippet Library')).toBeInTheDocument();
    
    // Wait for snippets to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3050/api/snippets/room/test-room',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });
    
    // Check if mock snippet renders
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
  });

  it('should not render when closed', () => {
    render(
      <CodeSnippetLibrary
        isOpen={false}
        onClose={() => {}}
        token="test-token"
        roomId="test-room"
        onInsertSnippet={() => {}}
      />
    );
    
    // Should not find the title when closed
    expect(screen.queryByText('Code Snippet Library')).not.toBeInTheDocument();
  });

  it('should handle snippet insertion', async () => {
    const mockInsertFn = jest.fn();
    
    render(
      <CodeSnippetLibrary
        isOpen={true}
        onClose={() => {}}
        token="test-token"
        roomId="test-room"
        onInsertSnippet={mockInsertFn}
      />
    );

    // Wait for snippets to load
    await waitFor(() => {
      expect(screen.getByText('React Component')).toBeInTheDocument();
    });
    
    // Find and click the insert button (Plus icon)
    const insertButtons = screen.getAllByTitle('Insert into editor');
    fireEvent.click(insertButtons[0]);
    
    // Check if insert function was called with the code
    expect(mockInsertFn).toHaveBeenCalledWith('function Component() { return <div>Hello</div>; }');
  });
}); 