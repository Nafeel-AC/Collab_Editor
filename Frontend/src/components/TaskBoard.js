"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronLeft,
  MoreVertical,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  GripVertical,
  GripHorizontal,
} from "lucide-react"
import { Link } from "react-router-dom"
import axios from "axios"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import "../Fonts/WinkingRough.css" // Import the local font CSS
import { API_BASE_URL } from '../config/api.config'

// Custom styles for animations
const taskAnimationStyles = `
  @keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.8); }
  }
  
  .animate-fadeout {
    animation: fadeOut 0.3s ease forwards;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .animate-slide-in {
    animation: slideIn 0.3s ease forwards;
  }
  
  .animate-slide-out {
    animation: slideOut 0.3s ease forwards;
  }
`;

// Update to the correct port where the backend server is running
const API_URL = `${API_BASE_URL}/api`

// Configure axios defaults for CORS
axios.defaults.withCredentials = true

// TaskBoard component with Winking Rough font styling
const TaskBoard = () => {
  // Add animation styles to the document
  useEffect(() => {
    // Create and inject animation styles
    const styleElement = document.createElement('style');
    styleElement.innerHTML = taskAnimationStyles;
    document.head.appendChild(styleElement);
    
    // Clean up on unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // State for columns and tasks
  const [columns, setColumns] = useState([
    { id: "todo", title: "To Do", color: "#3B82F6", icon: <Clock className="h-4 w-4 mr-2" /> },
    {
      id: "inProgress",
      title: "In Progress",
      color: "#F59E0B",
      icon: <ArrowRight className="h-4 w-4 mr-2" />,
    },
    { id: "done", title: "Done", color: "#10B981", icon: <Check className="h-4 w-4 mr-2" /> },
  ])

  // State for tasks
  const [tasks, setTasks] = useState({
    todo: [],
    inProgress: [],
    done: [],
  })

  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // State for new task form
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [newTaskColumn, setNewTaskColumn] = useState("todo")
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: new Date().toISOString().split("T")[0],
  })

  // State for edit task
  const [editingTask, setEditingTask] = useState(null)
  const [showEditTaskForm, setShowEditTaskForm] = useState(false)
  
  // State for delete confirmation
  const [taskToDelete, setTaskToDelete] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // For testing purposes - create sample tasks if no authentication
  const createSampleTasks = () => {
    const sampleTasks = {
      todo: [
        {
          id: "t1",
          title: "Research API Documentation",
          description: "Review and understand the API documentation for the project",
          priority: "high",
          dueDate: "2023-06-15",
        },
        {
          id: "t2",
          title: "Design Database Schema",
          description: "Create the initial database schema for the application",
          priority: "medium",
          dueDate: "2023-06-20",
        },
      ],
      inProgress: [
        {
          id: "t3",
          title: "Implement User Authentication",
          description: "Create user authentication flow with JWT",
          priority: "high",
          dueDate: "2023-06-18",
        },
      ],
      done: [
        {
          id: "t4",
          title: "Project Requirements Gathering",
          description: "Collect and document all project requirements",
          priority: "high",
          dueDate: "2023-06-05",
        },
      ],
    }

    setTasks(sampleTasks)
    setLoading(false)
  }

  // Fetch tasks from backend
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        // Get token from localStorage
        const token = localStorage.getItem("token");
        const userName = localStorage.getItem("userName");

        console.log("Authentication token:", token ? "Token exists" : "No token found");

        if (!token) {
          console.log("No authentication token found, using sample tasks instead");
          createSampleTasks();
          return;
        }

        console.log(`Fetching tasks for user: ${userName || 'Unknown'}`);
        console.log("Attempting to fetch tasks from:", `${API_URL}/tasks`);

        const response = await axios.get(`${API_URL}/tasks`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log(`Received ${response.data.length} tasks from server`);

        // Group tasks by status
        const groupedTasks = {
          todo: [],
          inProgress: [],
          done: [],
        };

        if (response.data.length === 0) {
          console.log("No tasks found for this user");
        }

        response.data.forEach((task) => {
          // Make sure the task has a valid status that matches our columns
          const status = task.status && groupedTasks[task.status] ? task.status : "todo";
          
          // Push task to appropriate column
          groupedTasks[status].push({
            id: task._id,
            title: task.title,
            description: task.description,
            priority: task.priority || "medium",
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          });
        });

        setTasks(groupedTasks);
        setError(null);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        
        if (err.response) {
          console.log("Server error response:", err.response.status, err.response.data);
          
          if (err.response.status === 401) {
            setError("Authentication error. Please log in again.");
            // Optionally redirect to login page
            // window.location.href = '/LoginPage';
          } else {
            setError(`Server error: ${err.response.data.message || 'Unknown error'}`);
          }
        } else if (err.request) {
          console.log("No response from server");
          setError("Cannot connect to server. Please check your connection.");
        } else {
          setError("An error occurred while fetching tasks.");
        }
        
        // If API fails, use sample tasks for demonstration
        console.log("Using sample tasks for demonstration");
        createSampleTasks();
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Handle adding a new task
  const handleAddTask = async () => {
    if (!newTask.title.trim()) return

    try {
      setLoading(true)
      // Get token from localStorage
      const token = localStorage.getItem("token")

      if (!token) {
        // If no token, just add to local state for demo purposes
        const newId = `t${Date.now()}`
        const createdTask = {
          id: newId,
          ...newTask,
        }

        setTasks((prev) => ({
          ...prev,
          [newTaskColumn]: [...prev[newTaskColumn], createdTask],
        }))

        setNewTask({
          title: "",
          description: "",
          priority: "medium",
          dueDate: new Date().toISOString().split("T")[0],
        })

        setShowNewTaskForm(false)
        return
      }

      console.log("Creating new task:", newTask)
      console.log("API endpoint:", `${API_URL}/tasks`)

      const taskData = {
        ...newTask,
        status: newTaskColumn,
      }

      console.log("Task data to be sent:", taskData)

      const response = await axios.post(`${API_URL}/tasks`, taskData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Create task response:", response.data)

      const createdTask = {
        id: response.data._id,
        title: response.data.title,
        description: response.data.description,
        priority: response.data.priority,
        dueDate: new Date(response.data.dueDate).toISOString().split("T")[0],
      }

      // Update state with new task
      setTasks((prev) => ({
        ...prev,
        [newTaskColumn]: [...prev[newTaskColumn], createdTask],
      }))

      // Reset form
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: new Date().toISOString().split("T")[0],
      })

      setShowNewTaskForm(false)
      setError(null)
    } catch (err) {
      console.error("Error creating task:", err)

      // For demo purposes, still add the task locally if API fails
      const newId = `t${Date.now()}`
      const createdTask = {
        id: newId,
        ...newTask,
      }

      setTasks((prev) => ({
        ...prev,
        [newTaskColumn]: [...prev[newTaskColumn], createdTask],
      }))

      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        dueDate: new Date().toISOString().split("T")[0],
      })

      setShowNewTaskForm(false)
      setError("Task added locally. Server connection failed: " + (err.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  // Handle editing a task
  const handleEditTask = async () => {
    if (!editingTask || !editingTask.title.trim()) return

    try {
      setLoading(true)
      // Get token from localStorage
      const token = localStorage.getItem("token")

      if (!token) {
        throw new Error("No authentication token found")
      }

      // Find which column the task is in
      const columnId = Object.keys(tasks).find((colId) => tasks[colId].some((task) => task.id === editingTask.id))

      if (!columnId) {
        throw new Error("Task not found")
      }

      await axios.put(
        `${API_URL}/tasks/${editingTask.id}`,
        {
          title: editingTask.title,
          description: editingTask.description,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
          status: columnId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Update state with edited task
      setTasks((prev) => ({
        ...prev,
        [columnId]: prev[columnId].map((task) => (task.id === editingTask.id ? editingTask : task)),
      }))

      setEditingTask(null)
      setShowEditTaskForm(false)
      setError(null)
    } catch (err) {
      console.error("Error updating task:", err)
      setError("Failed to update task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle deleting a task
  const handleDeleteTask = async (taskId) => {
    try {
      setLoading(true)
      
      // Find which column the task is in
      const columnId = Object.keys(tasks).find((colId) => 
        tasks[colId].some((task) => task.id === taskId)
      )
      
      if (!columnId) {
        throw new Error("Task not found")
      }
      
      // Get the element and add animation class
      const taskElement = document.getElementById(`task-${taskId}`)
      if (taskElement) {
        taskElement.classList.add('animate-fadeout')
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      
      // Get token from localStorage
      const token = localStorage.getItem("token")

      if (!token) {
        throw new Error("No authentication token found")
      }

      await axios.delete(`${API_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Update state by removing deleted task
      setTasks((prev) => {
        const result = {}

        Object.keys(prev).forEach((columnId) => {
          result[columnId] = prev[columnId].filter((task) => task.id !== taskId)
        })

        return result
      })

      // Show delete confirmation
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-[#1E1E1E] text-white px-4 py-3 rounded-lg shadow-lg border border-[#333] z-50 flex items-center animate-slide-in';
      toast.innerHTML = `
        <div class="mr-2 bg-[#EF4444] rounded-full p-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
        </div>
        <span class="font-['Winking Rough',sans-serif]">Task deleted successfully</span>
      `;
      document.body.appendChild(toast);
      
      // Remove toast after 3 seconds
      setTimeout(() => {
        toast.classList.replace('animate-slide-in', 'animate-slide-out');
        setTimeout(() => {
          if (document.body.contains(toast)) {
            document.body.removeChild(toast);
          }
        }, 300);
      }, 3000);

      setError(null)
    } catch (err) {
      console.error("Error deleting task:", err)
      setError("Failed to delete task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle moving a task to another column
  const handleMoveTask = async (taskId, sourceColumnId, targetColumnId) => {
    try {
      setLoading(true)
      // Get token from localStorage
      const token = localStorage.getItem("token")

      const taskToMove = tasks[sourceColumnId].find((task) => task.id === taskId)

      if (!taskToMove) {
        throw new Error("Task not found")
      }

      // Update state with moved task
      setTasks((prev) => ({
        ...prev,
        [sourceColumnId]: prev[sourceColumnId].filter((task) => task.id !== taskId),
        [targetColumnId]: [...prev[targetColumnId], taskToMove],
      }))

      if (!token) {
        console.log("No authentication token found, skipping API call")
        setLoading(false)
        return
      }

      await axios.put(
        `${API_URL}/tasks/${taskId}`,
        {
          ...taskToMove,
          status: targetColumnId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      setError(null)
    } catch (err) {
      console.error("Error moving task:", err)
      setError("Failed to move task. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Handle drag end for drag and drop functionality
  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result

    console.log("Drag end result:", result);

    // If there's no destination or the item was dropped back in its original position
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    // Get source and destination column IDs
    const sourceColumnId = source.droppableId;
    const destinationColumnId = destination.droppableId;

    // If it's within the same column, handle reordering
    if (sourceColumnId === destinationColumnId) {
      const column = tasks[sourceColumnId];
      const newTasks = Array.from(column);
      const [removed] = newTasks.splice(source.index, 1);
      newTasks.splice(destination.index, 0, removed);

      setTasks({
        ...tasks,
        [sourceColumnId]: newTasks
      });
    } else {
      // If it's between different columns
      const sourceColumn = tasks[sourceColumnId];
      const destColumn = tasks[destinationColumnId];
      const newSourceColumn = Array.from(sourceColumn);
      const newDestColumn = Array.from(destColumn);
      
      // Find task by draggableId
      const taskToMove = sourceColumn.find(task => task.id === draggableId);
      
      if (!taskToMove) {
        console.error("Task not found:", draggableId);
        return;
      }
      
      // Remove from source column
      newSourceColumn.splice(source.index, 1);
      
      // Insert into destination column at the right position
      newDestColumn.splice(destination.index, 0, taskToMove);
      
      // Update local state first
      setTasks({
        ...tasks,
        [sourceColumnId]: newSourceColumn,
        [destinationColumnId]: newDestColumn
      });

      // Don't call handleMoveTask since it's also updating the state and causing duplication
      // Instead, directly update the API without updating state again
      updateTaskStatusInAPI(draggableId, taskToMove, destinationColumnId);
    }
  }

  // New function to update task status in API without updating state
  const updateTaskStatusInAPI = async (taskId, taskData, targetColumnId) => {
    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");
      
      if (!token) {
        console.log("No authentication token found, skipping API call");
        return;
      }
      
      // Update task in the API
      await axios.put(
        `${API_URL}/tasks/${taskId}`,
        {
          ...taskData,
          status: targetColumnId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      console.log("Task moved successfully in API");
    } catch (err) {
      console.error("Error updating task status in API:", err);
      setError("Failed to update task status. UI updated locally only.");
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-[#EF4444]"
      case "medium":
        return "bg-[#FBBF24]"
      case "low":
        return "bg-[#22C55E]"
      default:
        return "bg-blue-500"
    }
  }

  const getColumnAccentColor = (columnId) => {
    switch (columnId) {
      case "todo":
        return "border-[#3B82F6]"
      case "inProgress":
        return "border-[#F59E0B]"
      case "done":
        return "border-[#10B981]"
      default:
        return "border-gray-700"
    }
  }
  
  const getColumnBgColor = (columnId) => {
    switch (columnId) {
      case "todo":
        return "bg-[#3B82F6]/10"
      case "inProgress":
        return "bg-[#F59E0B]/10"
      case "done":
        return "bg-[#10B981]/10" 
      default:
        return "bg-gray-800/20"
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white font-['Winking Rough',sans-serif] font-bold">
      {/* Header */}
      <header className="bg-[#1A1A1A] border-b border-gray-800 shadow-lg py-4">
        <div className="container mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center mr-6 text-gray-300 hover:text-white transition-colors">
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span className="font-['Winking Rough',sans-serif] font-bold text-lg">Back</span>
            </Link>
            <h1 className="text-2xl font-['Winking Rough',sans-serif] font-bold text-white">
              Task Management
            </h1>
          </div>
          <button
            onClick={() => {
              setShowNewTaskForm(true)
              setNewTaskColumn("todo")
            }}
            className="px-5 py-2.5 bg-[#1E1E1E] hover:bg-[#2A2A2A] text-white rounded-lg shadow-md flex items-center transition-all duration-200"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            <span className="font-['Winking Rough',sans-serif] font-bold">New Task</span>
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="container mx-auto px-6 mt-4">
          <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] px-4 py-3 rounded-md">
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {loading && tasks.todo.length === 0 && tasks.inProgress.length === 0 && tasks.done.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-[#B3B3B3] animate-spin mb-4" />
            <p className="text-[#B3B3B3]">Loading tasks...</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {columns.map((column) => (
                <div key={column.id} className="flex flex-col h-full">
                  {/* Column Header - With color accents */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-1 h-5 rounded mr-2`} style={{ backgroundColor: column.color }}></div>
                      <h2 className="font-['Winking Rough',sans-serif] font-bold text-lg text-white">{column.title}</h2>
                      <span className="ml-2 text-xs bg-[#242424] rounded-full px-2.5 py-1 font-medium text-[#B3B3B3]">
                        {tasks[column.id].length}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setShowNewTaskForm(true)
                        setNewTaskColumn(column.id)
                      }}
                      className={`p-1.5 bg-[#1E1E1E] hover:bg-[#2A2A2A] rounded-full transition-colors`}
                      disabled={loading}
                      style={{ color: column.color }}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Tasks Container - With column-specific styling */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-lg p-4 ${
                          snapshot.isDraggingOver ? getColumnBgColor(column.id) : "bg-[#1A1A1A]"
                        } transition-colors duration-200`}
                        style={{ minHeight: "70vh" }}
                      >
                        {loading && tasks[column.id].length === 0 ? (
                          <div className="h-full flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-[#B3B3B3] animate-spin" />
                          </div>
                        ) : (
                          <>
                            {tasks[column.id].length === 0 ? (
                              <div className="h-full flex items-center justify-center">
                                <p className="text-[#71717A] text-sm italic font-['Winking Rough',sans-serif] font-bold">No tasks in this column</p>
                              </div>
                            ) : (
                              <>
                                {tasks[column.id].map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        id={`task-${task.id}`}
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        className={`mb-4 bg-[#242424] rounded-lg shadow-md overflow-hidden hover:bg-[#2A2A2A] transition-all duration-200 ${
                                          snapshot.isDragging ? `ring-2 ring-[${column.color}] opacity-90 rotate-1 scale-105` : ""
                                        } cursor-move group relative`}
                                      >
                                        {/* Stylish Delete Button */}
                                        <button
                                          onClick={() => {
                                            setTaskToDelete(task)
                                            setShowDeleteConfirm(true)
                                          }}
                                          className="absolute top-3 right-3 bg-[#1A1A1A]/0 group-hover:bg-[#1A1A1A]/80 w-8 h-8 rounded-full flex items-center justify-center transform translate-x-12 group-hover:translate-x-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[#EF4444] hover:rotate-12 z-10"
                                          disabled={loading}
                                        >
                                          <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                        
                                        <div className="p-4">
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center w-full">
                                              <div 
                                                {...provided.dragHandleProps} 
                                                className="mr-3 p-1 rounded hover:bg-[#333333] transition-colors cursor-grab active:cursor-grabbing"
                                              >
                                                <GripHorizontal className="h-4 w-4 text-[#9CA3AF]" />
                                              </div>
                                              <h3 className="font-['Winking Rough',sans-serif] font-bold text-white">{task.title}</h3>
                                            </div>
                                            <div className="dropdown dropdown-end">
                                              <label
                                                tabIndex={0}
                                                className="cursor-pointer p-1 hover:bg-[#333333] rounded-full"
                                              >
                                                <MoreVertical className="h-4 w-4 text-[#9CA3AF]" />
                                              </label>
                                              <ul
                                                tabIndex={0}
                                                className="dropdown-content z-[1] menu p-2 shadow-lg bg-[#1E1E1E] border border-gray-800 rounded-md w-52 text-sm"
                                              >
                                                <li>
                                                  <button
                                                    onClick={() => {
                                                      setEditingTask({ ...task })
                                                      setShowEditTaskForm(true)
                                                    }}
                                                    className="hover:bg-[#2A2A2A]"
                                                    disabled={loading}
                                                  >
                                                    <Edit2 className="h-3.5 w-3.5" /> Edit
                                                  </button>
                                                </li>
                                                {column.id !== "todo" && (
                                                  <li>
                                                    <button
                                                      onClick={() => handleMoveTask(task.id, column.id, "todo")}
                                                      className="hover:bg-[#2A2A2A]"
                                                      disabled={loading}
                                                    >
                                                      <ChevronLeft className="h-3.5 w-3.5" /> Move to To Do
                                                    </button>
                                                  </li>
                                                )}
                                                {column.id !== "inProgress" && (
                                                  <li>
                                                    <button
                                                      onClick={() => handleMoveTask(task.id, column.id, "inProgress")}
                                                      className="hover:bg-[#2A2A2A]"
                                                      disabled={loading}
                                                    >
                                                      <Clock className="h-3.5 w-3.5" /> Move to In Progress
                                                    </button>
                                                  </li>
                                                )}
                                                {column.id !== "done" && (
                                                  <li>
                                                    <button
                                                      onClick={() => handleMoveTask(task.id, column.id, "done")}
                                                      className="hover:bg-[#2A2A2A]"
                                                      disabled={loading}
                                                    >
                                                      <Check className="h-3.5 w-3.5" /> Move to Done
                                                    </button>
                                                  </li>
                                                )}
                                              </ul>
                                            </div>
                                          </div>

                                          {task.description && (
                                            <p className="text-sm text-[#A1A1AA] mb-3 pl-7 font-bold font-['Winking Rough',sans-serif] italic">{task.description}</p>
                                          )}

                                          <div className="flex items-center justify-between mt-2 text-xs pl-7">
                                            <div className="flex items-center">
                                              <span
                                                className={`inline-block h-2 w-2 rounded-full ${getPriorityColor(task.priority)} mr-1.5`}
                                              ></span>
                                              <span className="capitalize text-[#9CA3AF] font-['Winking Rough',sans-serif] italic font-bold">{task.priority}</span>
                                            </div>

                                            <div className="flex items-center text-[#71717A]">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              <span className="font-['Winking Rough',sans-serif] italic font-bold">{new Date(task.dueDate).toLocaleDateString()}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </main>

      {/* New Task Modal with updated styling */}
      <AnimatePresence>
        {showNewTaskForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-[#1E1E1E] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-gray-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-['Winking Rough',sans-serif] font-bold text-white">Create New Task</h2>
                  <button
                    onClick={() => setShowNewTaskForm(false)}
                    className="p-1.5 rounded-full hover:bg-[#2A2A2A] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleAddTask()
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Title</label>
                      <input
                        type="text"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-[#9CA3AF]"
                        placeholder="Task title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Description</label>
                      <textarea
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-[#9CA3AF] resize-none"
                        placeholder="Task description"
                        rows="3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Priority</label>
                        <select
                          value={newTask.priority}
                          onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                          className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white font-['Winking Rough',sans-serif]"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Due Date</label>
                        <input
                          type="date"
                          value={newTask.dueDate}
                          onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                          className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Column</label>
                      <select
                        value={newTaskColumn}
                        onChange={(e) => setNewTaskColumn(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white font-['Winking Rough',sans-serif]"
                      >
                        {columns.map((column) => (
                          <option key={column.id} value={column.id} style={{color: "white", backgroundColor: "#242424"}}>
                            {column.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowNewTaskForm(false)}
                      className="px-4 py-2 text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A] rounded-md transition-colors font-['Winking Rough',sans-serif]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md shadow-md transition-all duration-200 font-['Winking Rough',sans-serif]"
                    >
                      Create Task
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Task Modal with updated styling */}
      <AnimatePresence>
        {showEditTaskForm && editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-[#1E1E1E] rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-gray-800"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-['Winking Rough',sans-serif] font-bold text-white">Edit Task</h2>
                  <button
                    onClick={() => setShowEditTaskForm(false)}
                    className="p-1.5 rounded-full hover:bg-[#2A2A2A] transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleEditTask()
                  }}
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Title</label>
                      <input
                        type="text"
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-[#9CA3AF]"
                        placeholder="Task title"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Description</label>
                      <textarea
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white placeholder-[#9CA3AF] resize-none"
                        placeholder="Task description"
                        rows="3"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Priority</label>
                        <select
                          value={editingTask.priority}
                          onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                          className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white font-['Winking Rough',sans-serif]"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-[#B3B3B3] mb-1 font-['Winking Rough',sans-serif]">Due Date</label>
                        <input
                          type="date"
                          value={editingTask.dueDate}
                          onChange={(e) => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                          className="w-full px-3 py-2.5 bg-[#242424] border border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-500 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEditTaskForm(false)}
                      className="px-4 py-2 text-[#B3B3B3] hover:text-white hover:bg-[#2A2A2A] rounded-md transition-colors font-['Winking Rough',sans-serif]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-md shadow-md transition-all duration-200 font-['Winking Rough',sans-serif]"
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteTask(editingTask.id)
                        setShowEditTaskForm(false)
                      }}
                      className="px-4 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-md transition-colors font-['Winking Rough',sans-serif]"
                    >
                      Delete
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && taskToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="bg-[#1E1E1E] rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-gray-800"
            >
              <div className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="bg-[#EF4444]/10 p-3 rounded-full mb-4">
                    <Trash2 className="h-6 w-6 text-[#EF4444]" />
                  </div>
                  <h2 className="text-xl font-['Winking Rough',sans-serif] font-bold text-white mb-2">Delete Task</h2>
                  <p className="text-gray-400 mb-6">
                    Are you sure you want to delete "{taskToDelete.title}"? This action cannot be undone.
                  </p>
                
                  <div className="flex gap-3 w-full">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setTaskToDelete(null)
                      }}
                      className="flex-1 px-4 py-2.5 bg-[#2A2A2A] hover:bg-[#333] text-white rounded-md transition-colors font-['Winking Rough',sans-serif]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteTask(taskToDelete.id)
                        setShowDeleteConfirm(false)
                        setTaskToDelete(null)
                      }}
                      className="flex-1 px-4 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-md transition-colors font-['Winking Rough',sans-serif] flex items-center justify-center"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Delete</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TaskBoard
