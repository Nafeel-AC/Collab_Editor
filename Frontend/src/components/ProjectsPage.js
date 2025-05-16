import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Trash2, Calendar, Plus, Search, ChevronLeft } from 'lucide-react';
import axios from 'axios';
import { showSuccess, showError } from '../utils/alertUtils';
import Squares from './Squares';
import { API_BASE_URL } from '../config/api.config.js';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Get authentication data
  const token = localStorage.getItem('token');
  const userName = localStorage.getItem('userName');
  
  useEffect(() => {
    // Redirect to login if not authenticated
    if (!token) {
      navigate('/LoginPage', { replace: true });
      return;
    }
    
    fetchProjects();
  }, [token, navigate]);
  
  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/projects`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      setProjects(response.data.projects);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoadProject = async (projectId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API_BASE_URL}/api/projects/load/${projectId}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      if (response.data?.roomId) {
        showSuccess('Project loaded successfully! Redirecting to editor...');
        // Navigate to the editor with the new room ID and original project ID
        navigate(`/editor/${response.data.roomId}`, { 
          state: { 
            username: userName,
            originalProjectId: projectId // Pass the original project ID
          } 
        });
      } else {
        showError('Failed to load project. No room ID returned.');
      }
    } catch (err) {
      console.error('Error loading project:', err);
      showError(`Failed to load project: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteProject = async (projectId, projectName) => {
    // Confirm deletion
    const confirmDelete = window.confirm(`Are you sure you want to delete project "${projectName}"? This cannot be undone.`);
    
    if (!confirmDelete) return;
    
    try {
      setLoading(true);
      await axios.delete(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        },
        withCredentials: true
      });
      
      showSuccess('Project deleted successfully');
      
      // Remove the deleted project from state
      setProjects(projects.filter(project => project._id !== projectId));
    } catch (err) {
      console.error('Error deleting project:', err);
      showError(`Failed to delete project: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateRoom = () => {
    navigate('/create-room', { state: { username: userName } });
  };
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  // Filter projects based on search term
  const filteredProjects = projects.filter(project => 
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Format date to a readable format
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // Get language badge for display
  const getLanguageBadge = (language) => {
    const lang = language?.toLowerCase() || 'javascript';
    let displayName = language || 'JavaScript';
    
    // Convert to display format
    if (lang === 'javascript') displayName = 'JavaScript';
    if (lang === 'typescript') displayName = 'TypeScript';
    if (lang === 'react') displayName = 'React';
    
    return (
      <span style={{
        backgroundColor: 'rgba(77, 93, 254, 0.15)',
        color: '#7d8afe',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: 500
      }}>
        {lang === 'javascript' && <span className="inline-block mr-1">⟨⟩</span>}
        {lang === 'typescript' && <span className="inline-block mr-1">⟨⟩</span>}
        {lang === 'react' && <span className="inline-block mr-1">⚛️</span>}
        {displayName}
      </span>
    );
  };
  
  // Simplified layout
  return (
    <div style={{ 
      backgroundColor: '#0A0A14', 
      minHeight: '100vh',
      color: 'white',
      position: 'relative'
    }}>
      {/* Background grid overlay */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        zIndex: 0 
      }}>
        <Squares 
          speed={0.5} 
          squareSize={40}
          direction='diagonal' 
          borderColor='rgba(255, 255, 255, 0.1)'
          hoverFillColor='rgba(77, 93, 254, 0.2)'
        />
      </div>
      
      {/* Content */}
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '1.5rem 1rem',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '1.5rem' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button
              onClick={handleBackToDashboard}
              style={{
                marginRight: '1rem',
                padding: '0.5rem',
                borderRadius: '9999px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'white',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2A2A3A'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <ChevronLeft size={20} />
            </button>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>My Projects</h1>
          </div>
          
          <button
            onClick={handleCreateRoom}
            style={{
              backgroundColor: '#4D5DFE',
              color: 'white',
              padding: '0.5rem 1.25rem',
              borderRadius: '9999px',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(77, 93, 254, 0.3)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#3A4AE1'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4D5DFE'}
          >
            <Plus size={18} style={{ marginRight: '0.5rem' }} />
            New Project
          </button>
        </div>
        
        {/* Search Bar */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              backgroundColor: 'rgba(30, 30, 45, 0.6)',
              backdropFilter: 'blur(4px)',
              border: '1px solid #2A2A3A',
              borderRadius: '0.375rem',
              color: 'white',
              outline: 'none'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#4D5DFE'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#2A2A3A'}
          />
          <Search style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#8F8FA3' 
          }} size={20} />
        </div>
        
        {/* Projects List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '16rem' }}>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4D5DFE]"></div>
          </div>
        ) : error ? (
          <div style={{ 
            backgroundColor: 'rgba(233, 69, 96, 0.1)', 
            color: '#E94560', 
            padding: '1rem', 
            borderRadius: '0.375rem' 
          }}>
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '4rem 2rem',
            backgroundColor: 'rgba(20, 20, 27, 0.6)',
            backdropFilter: 'blur(4px)',
            borderRadius: '0.5rem'
          }}>
            <FolderOpen size={48} style={{ margin: '0 auto 1rem', color: '#8F8FA3' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>No projects found</h2>
            <p style={{ color: '#8F8FA3', marginBottom: '2rem' }}>
              You haven't created any projects yet, or no projects match your search.
            </p>
            <button
              onClick={handleCreateRoom}
              style={{
                backgroundColor: '#4D5DFE',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 15px rgba(77, 93, 254, 0.3)'
              }}
            >
              <Plus size={18} style={{ marginRight: '0.5rem' }} />
              Create your first project
            </button>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {filteredProjects.map((project) => (
              <div
                key={project._id}
                onClick={() => handleLoadProject(project._id)}
                style={{
                  backgroundColor: 'rgba(20, 20, 30, 0.6)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid #2A2A3A',
                  borderRadius: '0.5rem',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(77, 93, 254, 0.5)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(77, 93, 254, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#2A2A3A';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ padding: '1.25rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: '0.75rem' 
                  }}>
                    <h3 style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '600', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      paddingRight: '1rem',
                      color: 'white'
                    }}>
                      {project.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project._id, project.name);
                      }}
                      style={{
                        color: '#8F8FA3',
                        backgroundColor: 'transparent',
                        border: 'none',
                        padding: '0.25rem',
                        borderRadius: '0.25rem',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s ease, color 0.2s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.color = '#E94560'}
                      onMouseOut={(e) => e.currentTarget.style.color = '#8F8FA3'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <p style={{ 
                    color: '#8F8FA3', 
                    fontSize: '0.875rem', 
                    marginBottom: '1.25rem',
                    height: '2.5rem',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {project.description || `Project created from room ${project.roomId}`}
                  </p>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    color: '#8F8FA3', 
                    fontSize: '0.75rem', 
                    marginBottom: '0.75rem' 
                  }}>
                    <Calendar size={14} style={{ marginRight: '0.5rem', opacity: 0.7 }} />
                    <span>{formatDate(project.createdAt)}</span>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    {getLanguageBadge(project.language)}
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadProject(project._id);
                    }}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(77, 93, 254, 0.1)',
                      color: '#4D5DFE',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(77, 93, 254, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(77, 93, 254, 0.1)'}
                  >
                    <FolderOpen size={16} style={{ marginRight: '0.5rem' }} />
                    Open Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectsPage; 