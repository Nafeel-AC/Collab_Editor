import express from 'express';
import {
  getSnippetsByRoom,
  getSnippetById,
  createSnippet,
  updateSnippet,
  deleteSnippet,
  searchSnippets
} from '../controllers/snippet.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get all snippets in a room
router.get('/room/:roomId', getSnippetsByRoom);

// Search snippets in a room
router.get('/search/:roomId', searchSnippets);

// Get snippet by ID
router.get('/:snippetId', getSnippetById);

// Create a new snippet
router.post('/', createSnippet);

// Update a snippet
router.put('/:snippetId', updateSnippet);

// Delete a snippet
router.delete('/:snippetId', deleteSnippet);

export default router; 