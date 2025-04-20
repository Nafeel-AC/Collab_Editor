import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import Task from '../models/task.model.js';

const router = express.Router();

// Get all tasks for logged in user
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user.id });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Create new task
router.post('/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, dueDate, status } = req.body;
    
    const newTask = new Task({
      title,
      description,
      priority,
      dueDate,
      status,
      user: req.user.id
    });
    
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Update task
router.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, status } = req.body;
    
    // Check if task exists and belongs to user
    const task = await Task.findOne({ _id: id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    
    const updatedTask = await Task.findByIdAndUpdate(
      id, 
      { 
        title, 
        description, 
        priority, 
        dueDate, 
        status,
        updatedAt: Date.now()
      },
      { new: true }
    );
    
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Delete task
router.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if task exists and belongs to user
    const task = await Task.findOne({ _id: id, user: req.user.id });
    if (!task) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    
    await Task.findByIdAndDelete(id);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

export default router; 