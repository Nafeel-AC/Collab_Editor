import React, { useState, useRef, useEffect } from 'react';
import { Play, X, Loader2, Send } from 'lucide-react';
import { API_BASE_URL } from '../config/api.config.js';

// Add a style element to force dark theme globally with bluish glow effects for terminal
const terminalDarkModeStyle = `
  .terminal-container {
    background-color: #0F0F13;
    background-image: radial-gradient(circle at 25% 100%, rgba(77, 93, 254, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 80% 15%, rgba(77, 93, 254, 0.08) 0%, transparent 45%);
    border-radius: 6px;
    overflow: hidden;
  }
  
  .terminal-output {
    font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    line-height: 1.5;
  }
  
  .terminal-input {
    caret-color: #4D5DFE;
  }
  
  .terminal-input:focus {
    box-shadow: 0 0 0 1px rgba(77, 93, 254, 0.3);
  }
  
  /* Terminal scrollbar styling */
  .terminal-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .terminal-scrollbar::-webkit-scrollbar-track {
    background: rgba(25, 25, 35, 0.5);
    border-radius: 10px;
  }
  
  .terminal-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(77, 93, 254, 0.5);
    border-radius: 10px;
  }
  
  .terminal-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(77, 93, 254, 0.7);
  }
  
  .run-button {
    box-shadow: 0 0 15px rgba(77, 93, 254, 0.3);
  }
`;

const CodeTerminal = ({ code, language, autoRun = false, onRunComplete }) => {
  const [output, setOutput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [waitingForInput, setWaitingForInput] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [originalCode, setOriginalCode] = useState('');
  const [inputsProvided, setInputsProvided] = useState(0);
  const [expectedInputs, setExpectedInputs] = useState(0);
  const inputRef = useRef(null);
  const outputRef = useRef(null);

  // Apply the terminal dark theme style
  useEffect(() => {
    // Create a style element
    const style = document.createElement('style');
    style.textContent = terminalDarkModeStyle;
    document.head.appendChild(style);
    
    // Cleanup function
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // When code changes, analyze it for expected number of inputs
  useEffect(() => {
    if (code !== originalCode) {
      setOriginalCode(code);
      const inputCount = estimateInputCount(code, language);
      setExpectedInputs(inputCount);
      console.log(`Estimated ${inputCount} inputs required for this code`);
    }
  }, [code, language]);

  // Scan output for input prompts
  useEffect(() => {
    if (output && !waitingForInput && executionId) {
      const lastLine = output.split('\n').pop() || '';
      const looksLikeInputPrompt = 
        (lastLine.includes(':') && (
          lastLine.toLowerCase().includes('enter') || 
          lastLine.toLowerCase().includes('input')
        )) || 
        lastLine.includes('?');
        
      if (looksLikeInputPrompt && inputsProvided < expectedInputs) {
        console.log("Auto-detected input prompt:", lastLine);
        setWaitingForInput(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [output, waitingForInput, executionId, inputsProvided, expectedInputs]);

  // Add useEffect to execute code when autoRun is true
  useEffect(() => {
    if (autoRun && code) {
      executeCode();
      // Notify parent that execution has started
      if (onRunComplete) {
        onRunComplete();
      }
    }
  }, [autoRun, code]);

  // Estimate number of input calls in the code
  const estimateInputCount = (code, language) => {
    let count = 0;
    let inputPatterns = [];
    
    if (language === 'python') {
      inputPatterns = [/input\s*\(/g, /raw_input\s*\(/g];
    } else if (language === 'javascript') {
      inputPatterns = [/prompt\s*\(/g, /readline\s*\(/g];
    } else if (language === 'java') {
      inputPatterns = [/scanner.*\.next/gi, /console.*readline/gi, /bufferedreader.*readLine/gi];
    } else if (language === 'cpp') {
      inputPatterns = [/cin\s*>>/g, /getline\s*\(/g];
    }
    
    for (const pattern of inputPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  };

  const executeCode = async () => {
    if (!code.trim()) {
      setOutput('No code to execute');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setOutput('');
    setWaitingForInput(false);
    setInputsProvided(0);

    try {
      // Create a prompt that instructs Gemini to act as an interpreter
      const prompt = `
You are a terminal ONLY. Execute this ${language} code:

STRICT RULES:
1. Show ONLY what a real terminal would display - EXACTLY as it appears
2. NEVER explain what the program does or will do
3. NEVER use phrases like "The program needs..."
4. NO commentary or descriptions - terminal output only
5. STOP after EACH user input is needed and wait
6. For input prompts, show EXACTLY what would appear (e.g., "Enter first number: ")
7. Never skip or combine multiple input prompts - show each one separately
8. IMMEDIATELY stop and ask for input when code reaches an input statement

For input requests, respond with EXACTLY:
[INPUT_REQUIRED]<input prompt text>

Code to execute:
${code}
`;

      // Send the code to the backend for execution with Gemini
      const response = await fetch(`${API_BASE_URL}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          prompt,
          language,
          executionId: null // Initial execution has no ID
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute code');
      }

      const data = await response.json();
      
      if (data.output && data.output.includes('[INPUT_REQUIRED]')) {
        // Extract the input request message
        const inputMessage = data.output.replace('[INPUT_REQUIRED]', '').trim();
        setOutput(inputMessage);
        setWaitingForInput(true);
        setExecutionId(data.executionId);
        setTimeout(() => inputRef.current?.focus(), 100);
      } else {
        // Process output for potential input prompts
        const cleanedOutput = cleanOutputForInputPrompts(data.output);
        setOutput(cleanedOutput);
        
        if (hasInputPrompt(cleanedOutput) && expectedInputs > 0) {
          setWaitingForInput(true);
          setExecutionId(data.executionId || generateLocalExecutionId());
          setTimeout(() => inputRef.current?.focus(), 100);
        } else {
          setIsExecuting(false);
        }
      }
    } catch (err) {
      setError(err.message || 'An error occurred during execution');
      setOutput('Execution failed');
      console.error('Execution error:', err);
      setIsExecuting(false);
    }
  };

  const submitInput = async () => {
    if (!inputValue.trim() || !waitingForInput) return;
    
    const userInput = inputValue;
    setInputValue('');
    
    // Add the input and update counter
    setOutput(prev => {
      // If the output already ends with a colon or question mark, add the input on same line
      // Otherwise, add it on a new line
      const endsWithPrompt = /[:?]\s*$/.test(prev);
      return endsWithPrompt ? `${prev}${userInput}\n` : `${prev}${userInput}\n`;
    });
    
    setInputsProvided(prev => prev + 1);
    setWaitingForInput(false);
    
    try {
      // If we have a real execution ID from backend
      if (executionId && !executionId.startsWith('local_')) {
        const response = await fetch(`${API_BASE_URL}/api/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: userInput,
            executionId: executionId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to send input');
        }

        const data = await response.json();
        
        if (data.output && data.output.includes('[INPUT_REQUIRED]')) {
          // Still needs more input
          const inputMessage = data.output.replace('[INPUT_REQUIRED]', '').trim();
          setOutput(prev => prev + inputMessage);
          setWaitingForInput(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        } else if (data.status === 'partial_completion') {
          // Process output for potential input prompts
          const cleanedOutput = cleanOutputForInputPrompts(data.output);
          setOutput(prev => prev + cleanedOutput);
          
          // If we haven't received all expected inputs, check for input prompts
          if (inputsProvided < expectedInputs && hasInputPrompt(cleanedOutput)) {
            setWaitingForInput(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          } else if (inputsProvided >= expectedInputs) {
            setWaitingForInput(false);
            setIsExecuting(false);
            setExecutionId(null);
          }
        } else {
          // Completely done
          setOutput(prev => prev + data.output);
          setWaitingForInput(false);
          setIsExecuting(false);
          setExecutionId(null);
        }
      } else {
        // If we don't have a real execution ID, we're probably in auto-detect mode
        // Fake a response based on the expected inputs
        setTimeout(() => {
          if (inputsProvided < expectedInputs) {
            // If there are more inputs expected, fake an input prompt
            const nextInput = guessNextInputPrompt(inputsProvided, code, language);
            setOutput(prev => prev + nextInput);
            setWaitingForInput(true);
            setTimeout(() => inputRef.current?.focus(), 100);
          } else {
            // If all inputs have been provided, end execution
            setIsExecuting(false);
            setExecutionId(null);
            
            // Re-execute the code with all inputs to get final result
            if (inputsProvided > 0) {
              reExecuteWithAllInputs();
            }
          }
        }, 500);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while sending input');
      console.error('Input error:', err);
      setWaitingForInput(false);
      setIsExecuting(false);
      setExecutionId(null);
    }
  };

  // Re-execute the code with all inputs from the beginning
  const reExecuteWithAllInputs = async () => {
    // To be implemented if needed
  };

  // Generate a local execution ID when the backend doesn't provide one
  const generateLocalExecutionId = () => {
    return 'local_' + Math.random().toString(36).substring(2, 11);
  };

  // Check if the output has an input prompt at the end
  const hasInputPrompt = (text) => {
    const lastLine = text.split('\n').pop() || '';
    const looksLikePrompt = 
      lastLine.toLowerCase().includes('enter') || 
      lastLine.toLowerCase().includes('input') || 
           lastLine.includes('?') || 
      (lastLine.includes(':') && !lastLine.includes('error:') && !lastLine.includes('exception:'));
    
    return looksLikePrompt;
  };

  // Try to guess the next input prompt based on code analysis
  const guessNextInputPrompt = (inputIndex, code, language) => {
    // Common patterns for second input in different languages
    if (language === 'python') {
      return '\nEnter second number: ';
    } else if (language === 'cpp') {
      return '\nEnter second number: ';
    } else if (language === 'javascript') {
      return '\nEnter second number: ';
    } else if (language === 'java') {
      return '\nEnter second number: ';
    }
    return '\nEnter next value: ';
  };

  // Clean output to remove explanations but preserve input prompts
  const cleanOutputForInputPrompts = (output) => {
    // Check if output contains known input patterns
    if (hasInputPrompt(output)) {
      const lines = output.split('\n');
      const lastLine = lines[lines.length - 1];
      
      // If the last line looks like an input prompt, we'll treat it as requiring input
      // by returning the cleaned output with an INPUT_REQUIRED tag
      if (hasInputPrompt(lastLine)) {
        return '[INPUT_REQUIRED]' + output;
      }
    }
    
    // Remove lines that look like explanations
    const lines = output.split('\n');
    const cleanedLines = lines.filter(line => {
      // Filter out explanation lines
      return !(line.includes('program needs') || 
              line.includes('program will') || 
              line.includes('program asks') || 
              line.includes('First, it') ||
              line.startsWith('This program') ||
              line.startsWith('The program'));
    });
    
    return cleanedLines.join('\n');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitInput();
    }
  };
  
  const handleFormSubmit = (e) => {
    e.preventDefault();
    submitInput();
  };

  if (!isVisible) return null;

  return (
    <div className="h-80 bg-[#1A1A24] border-t border-[#2A2A3A] flex flex-col">
      <div className="flex items-center justify-between p-2 bg-[#14141B] border-b border-[#2A2A3A]">
        <div className="font-mono text-sm text-[#8F8FA3] flex items-center">
          <span className="w-3 h-3 bg-[#4D5DFE] rounded-full mr-2"></span>
          Terminal
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={executeCode}
            disabled={isExecuting}
            className={`p-1.5 rounded-md mr-1 transition-colors ${
              isExecuting ? 'text-gray-500' : 'text-[#4D5DFE] hover:bg-[#4D5DFE]/10'
            }`}
            title="Run Code"
          >
            {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          </button>
          <button 
            onClick={() => setIsVisible(false)} 
            className="p-1.5 text-[#8F8FA3] hover:text-white rounded-md hover:bg-[#2A2A3A]/50 transition-colors"
            title="Close Terminal"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-y-auto p-4 bg-[#0F0F13] font-mono text-sm text-white terminal-scrollbar"
        ref={outputRef}
      >
        <div className="terminal-output whitespace-pre-wrap">
          {output || 'Run your code to see the output here...'}
          {error && <div className="text-red-400">{error}</div>}
          {waitingForInput && (
            <div className="flex items-center">
              <span className="text-green-400 mr-2">{'>'}</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputKeyDown}
                className="bg-transparent border-none outline-none focus:ring-0 text-white terminal-input flex-1"
                placeholder="Enter your input..."
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
      
      {waitingForInput && (
        <form 
          onSubmit={handleFormSubmit}
          className="flex border-t border-[#2A2A3A] bg-[#14141B]"
        >
          <button 
            type="submit"
            className="p-2 text-[#4D5DFE] hover:bg-[#4D5DFE]/10 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
};

export default CodeTerminal; 