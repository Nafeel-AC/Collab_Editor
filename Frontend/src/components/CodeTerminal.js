import React, { useState } from 'react';
import { Play, X, Loader2 } from 'lucide-react';

const CodeTerminal = ({ code, language }) => {
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [error, setError] = useState(null);

  const executeCode = async () => {
    if (!code.trim()) {
      setOutput('No code to execute');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setOutput('Executing code...');

    try {
      // Create a prompt that instructs Gemini to act as an interpreter
      const prompt = `
You are a code interpreter that only outputs the result of executing the following code.
Only respond with the exact output of the code (including all console.log statements and errors).
Do not include any explanations, markdown formatting, or additional text - ONLY output.
Never include your own text like "Output:" or "Result:" or code blocks with backticks.

Language: ${language}

Code to execute:
${code}
`;

      // Send the code to the backend for execution with Gemini
      const response = await fetch('http://localhost:3050/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          language 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute code');
      }

      const data = await response.json();
      setOutput(data.output || 'No output');
    } catch (err) {
      setError(err.message || 'An error occurred during execution');
      setOutput('Execution failed');
      console.error('Execution error:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gray-800 border-t border-gray-700 text-white">
      <div className="flex justify-between items-center p-2 bg-gray-900">
        <div className="flex items-center">
          <span className="font-mono text-sm mr-2">Terminal Output</span>
          {isExecuting ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
          ) : (
            <button
              onClick={executeCode}
              className="bg-green-600 hover:bg-green-700 text-white p-1 rounded flex items-center text-xs"
              disabled={isExecuting}
            >
              <Play className="h-3 w-3 mr-1" />
              Run
            </button>
          )}
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div 
        className="font-mono text-sm p-3 bg-black overflow-auto max-h-40"
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {error ? (
          <div className="text-red-400">{error}</div>
        ) : (
          output || 'Terminal ready. Click Run to execute your code.'
        )}
      </div>
    </div>
  );
};

export default CodeTerminal; 