import Snippet from '../models/snippet.model.js';
import { StatusCodes } from 'http-status-codes';

// Get all snippets for a room
export const getSnippetsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const snippets = await Snippet.find({ roomId })
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'userName email');
    
    return res.status(StatusCodes.OK).json(snippets);
  } catch (error) {
    console.error('Error fetching snippets:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch snippets. Please try again later.'
    });
  }
};

// Get snippet by ID
export const getSnippetById = async (req, res) => {
  try {
    const { snippetId } = req.params;
    const snippet = await Snippet.findById(snippetId)
      .populate('createdBy', 'userName email');
    
    if (!snippet) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Snippet not found'
      });
    }
    
    return res.status(StatusCodes.OK).json(snippet);
  } catch (error) {
    console.error('Error fetching snippet:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to fetch snippet. Please try again later.'
    });
  }
};

// Create a new snippet
export const createSnippet = async (req, res) => {
  try {
    const { title, description, code, language, category, roomId } = req.body;
    
    if (!title || !code || !roomId) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Title, code, and roomId are required'
      });
    }
    
    const snippet = new Snippet({
      title,
      description: description || '',
      code,
      language: language || 'javascript',
      category: category || 'general',
      roomId,
      createdBy: req.user.id
    });
    
    const savedSnippet = await snippet.save();
    
    // Populate creator info
    await savedSnippet.populate('createdBy', 'userName email');
    
    return res.status(StatusCodes.CREATED).json(savedSnippet);
  } catch (error) {
    console.error('Error creating snippet:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to create snippet. Please try again later.'
    });
  }
};

// Update a snippet
export const updateSnippet = async (req, res) => {
  try {
    const { snippetId } = req.params;
    const { title, description, code, language, category } = req.body;
    
    if (!title || !code) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: 'Title and code are required'
      });
    }
    
    // Find the snippet
    const snippet = await Snippet.findById(snippetId);
    
    if (!snippet) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Snippet not found'
      });
    }
    
    // Check if user is the creator of the snippet
    if (snippet.createdBy.toString() !== req.user.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'You do not have permission to update this snippet'
      });
    }
    
    // Update snippet fields
    snippet.title = title;
    snippet.description = description || '';
    snippet.code = code;
    snippet.language = language || 'javascript';
    snippet.category = category || 'general';
    snippet.updatedAt = Date.now();
    
    const updatedSnippet = await snippet.save();
    
    // Populate creator info
    await updatedSnippet.populate('createdBy', 'userName email');
    
    return res.status(StatusCodes.OK).json(updatedSnippet);
  } catch (error) {
    console.error('Error updating snippet:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to update snippet. Please try again later.'
    });
  }
};

// Delete a snippet
export const deleteSnippet = async (req, res) => {
  try {
    const { snippetId } = req.params;
    
    // Find the snippet
    const snippet = await Snippet.findById(snippetId);
    
    if (!snippet) {
      return res.status(StatusCodes.NOT_FOUND).json({
        error: 'Snippet not found'
      });
    }
    
    // Check if user is the creator of the snippet
    if (snippet.createdBy.toString() !== req.user.id) {
      return res.status(StatusCodes.FORBIDDEN).json({
        error: 'You do not have permission to delete this snippet'
      });
    }
    
    await Snippet.findByIdAndDelete(snippetId);
    
    return res.status(StatusCodes.OK).json({
      message: 'Snippet deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting snippet:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to delete snippet. Please try again later.'
    });
  }
};

// Search snippets in a room
export const searchSnippets = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { query, category } = req.query;
    
    let searchQuery = { roomId };
    
    // Add text search if query is provided
    if (query && query.trim().length > 0) {
      searchQuery.$text = { $search: query };
    }
    
    // Add category filter if provided
    if (category && category !== 'all') {
      searchQuery.category = category;
    }
    
    const snippets = await Snippet.find(searchQuery)
      .sort({ updatedAt: -1 })
      .populate('createdBy', 'userName email');
    
    return res.status(StatusCodes.OK).json(snippets);
  } catch (error) {
    console.error('Error searching snippets:', error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: 'Failed to search snippets. Please try again later.'
    });
  }
}; 