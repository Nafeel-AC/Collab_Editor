import express from 'express';
import { verifyToken } from '../middlewares/auth.middleware.js';
import Task from '../models/task.model.js';

const router = express.Router();

// Get all tasks for logged in user
router.get('/tasks', verifyToken, async (req, res) => {
  try {
    console.log('Fetching tasks for user:', req.userId);
    const tasks = await Task.find({ user: req.userId });
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks', error: error.message });
  }
});

// Create new task
router.post('/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, priority, dueDate, status } = req.body;
    
    console.log('Creating task for user:', req.userId);
    console.log('Task data:', { title, description, priority, dueDate, status });
    
    const newTask = new Task({
      title,
      description,
      priority,
      dueDate,
      status,
      user: req.userId
    });
    
    const savedTask = await newTask.save();
    console.log('Task saved successfully:', savedTask._id);
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task', error: error.message });
  }
});

// Update task
router.put('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, dueDate, status } = req.body;
    
    console.log('Updating task:', id, 'for user:', req.userId);
    
    // Check if task exists and belongs to user
    const task = await Task.findOne({ _id: id, user: req.userId });
    if (!task) {
      console.log('Task not found or unauthorized');
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
    
    console.log('Task updated successfully');
    res.status(200).json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task', error: error.message });
  }
});

// Delete task
router.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Deleting task:', id, 'for user:', req.userId);
    
    // Check if task exists and belongs to user
    const task = await Task.findOne({ _id: id, user: req.userId });
    if (!task) {
      console.log('Task not found or unauthorized');
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    
    await Task.findByIdAndDelete(id);
    console.log('Task deleted successfully');
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task', error: error.message });
  }
});

export default router; 