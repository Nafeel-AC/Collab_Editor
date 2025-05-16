import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Store ongoing code execution sessions
const executionSessions = new Map();

// Execute code using Gemini API
export const executeCode = async (req, res) => {
  try {
    const { prompt, language, executionId, input } = req.body;
    
    // Case 1: Continuing an existing session with user input
    if (executionId && executionSessions.has(executionId)) {
      return handleUserInput(req, res, executionId, input);
    }
    
    // Case 2: Starting a new execution
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required for new executions" });
    }
    
    console.log(`Executing ${language} code with Gemini...`);
    
    // Use the Google Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    // Extract just the code part from the prompt
    const codePart = prompt.split('Code to execute:')[1]?.trim() || prompt;
    
    // Create execution prompt
    const executionPrompt = createExecutionPrompt(language, codePart, []);
    
    // Generate a unique ID for this execution session
    const newExecutionId = uuidv4();
    
    // Execute the code with Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: executionPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.0,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(500).json({ 
        message: "Failed to execute code with Gemini",
        error: errorText 
      });
    }
    
    const data = await response.json();
    
    // Extract the generated text from Gemini's response
    let output = "";
    if (data.candidates && data.candidates.length > 0) {
      if (data.candidates[0].content && data.candidates[0].content.parts) {
        output = data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join("\n");
      }
    }
    
    // Clean the output (remove any explanations or codeblocks)
    output = cleanGeminiOutput(output, language);
    
    // Check if input is required
    if (output.includes('[INPUT_REQUIRED]')) {
      // Store the session for future interactions
      executionSessions.set(newExecutionId, {
        language,
        code: codePart,
        history: [output],
        inputs: []
      });
      
      // Set a timeout to clean up the session after 30 minutes of inactivity
      setTimeout(() => {
        if (executionSessions.has(newExecutionId)) {
          executionSessions.delete(newExecutionId);
          console.log(`Execution session ${newExecutionId} timed out and was cleaned up`);
        }
      }, 30 * 60 * 1000);
      
      console.log("Code execution requires input");
      res.status(200).json({ 
        status: "input_required",
        output,
        executionId: newExecutionId
      });
    } else {
      console.log("Code execution completed");
      res.status(200).json({ 
        status: "completed",
        output 
      });
    }
  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({ 
      message: "Failed to execute code",
      error: error.message 
    });
  }
};

// Handle user input for an ongoing code execution
const handleUserInput = async (req, res, executionId, input) => {
  try {
    if (!input) {
      return res.status(400).json({ message: "Input is required" });
    }
    
    const session = executionSessions.get(executionId);
    if (!session) {
      return res.status(404).json({ message: "Execution session not found or expired" });
    }
    
    const { language, code, inputs, history } = session;
    
    // Add the new input to the session
    inputs.push(input);
    
    // Create a new prompt with all previous inputs
    const executionPrompt = createExecutionPrompt(language, code, inputs);
    
    // Use the Google Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    // Execute the code with Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: executionPrompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.0,
          topK: 1,
          topP: 1,
          maxOutputTokens: 8192,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_ONLY_HIGH"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return res.status(500).json({ 
        message: "Failed to continue code execution with Gemini",
        error: errorText 
      });
    }
    
    const data = await response.json();
    
    // Extract the generated text from Gemini's response
    let output = "";
    if (data.candidates && data.candidates.length > 0) {
      if (data.candidates[0].content && data.candidates[0].content.parts) {
        output = data.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join("\n");
      }
    }
    
    // Clean the output (remove any explanations or codeblocks)
    output = cleanGeminiOutput(output, language);
    
    // Add the new output to the session history
    history.push(output);
    
    // Check if more input is required
    if (output.includes('[INPUT_REQUIRED]')) {
      console.log("Code execution requires more input");
      res.status(200).json({ 
        status: "input_required",
        output,
        executionId
      });
    } else {
      // Only clean up the session if we're sure there are no more inputs needed
      // Check if the program might need more inputs in the future
      // For example, if the original code has multiple input() calls but we've only processed some
      const potentialMoreInputs = containsMoreInputCalls(code, inputs.length, language);
      
      if (potentialMoreInputs) {
        // The program might need more inputs but isn't currently asking
        // Keep the session alive just in case
        console.log("Code execution completed partial step, session maintained");
        res.status(200).json({ 
          status: "partial_completion",
          output,
          executionId
        });
      } else {
        // Clean up the session as it's completely done
        executionSessions.delete(executionId);
        console.log("Code execution fully completed");
        res.status(200).json({ 
          status: "completed",
          output 
        });
      }
    }
  } catch (error) {
    console.error("Error handling input:", error);
    res.status(500).json({ 
      message: "Failed to process input",
      error: error.message 
    });
  }
};

// Helper function to check if code potentially has more input calls than we've processed
const containsMoreInputCalls = (code, processedInputs, language) => {
  // Simple heuristic check for potential input calls in code
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
  
  // Count potential input calls
  let potentialInputCalls = 0;
  for (const pattern of inputPatterns) {
    const matches = code.match(pattern);
    if (matches) {
      potentialInputCalls += matches.length;
    }
  }
  
  // If we've processed fewer inputs than potential input calls, return true
  return potentialInputCalls > processedInputs;
};

// Create language-specific execution prompts
const createExecutionPrompt = (language, code, inputs) => {
  const inputsSection = inputs.length > 0 
    ? `\nWhen the program requires input, use exactly these values in order without any additional text:
${inputs.map((input, index) => `${input}`).join('\n')}

IMPORTANT: If the code needs more than ${inputs.length} inputs, respond with [INPUT_REQUIRED] followed by the exact next input prompt from the code.`
    : '';

  const basePrompt = `
You are a terminal executing ${language} code. You MUST act exactly like a real terminal.

CRITICAL REQUIREMENTS:
1. Display EXACTLY what a real terminal would show when running this code - nothing more
2. NEVER explain what the program does or will do
3. NEVER add any preamble text like "This program requires two inputs"
4. NEVER describe the program's behavior before showing output
5. Start your output with the VERY FIRST thing the program outputs (such as an input prompt)
6. Show syntax errors exactly as a real compiler/interpreter would
7. Show ONLY the terminal output, as if this is a real terminal window
8. Don't skip input prompts - show each one separately and wait for user input
9. NEVER SKIP asking for input - when an input is required in the code, immediately show [INPUT_REQUIRED] followed by the exact prompt

When input is needed but none is provided or more input is needed, respond with:
[INPUT_REQUIRED]<exact input prompt from code>

${inputsSection}

Code to execute:
${code}
`;

  return basePrompt;
};

// Helper function to clean Gemini output
const cleanGeminiOutput = (output, language) => {
  // Remove markdown code blocks
  output = output.replace(/```[\w]*\n/g, '').replace(/```$/g, '');
  
  // Remove any explanations before the first INPUT_REQUIRED marker
  if (output.includes('[INPUT_REQUIRED]')) {
    const parts = output.split('[INPUT_REQUIRED]');
    // Keep only the input requirement part
    output = '[INPUT_REQUIRED]' + parts[1];
    return output.trim();
  }
  
  // If execution gets here, there's no INPUT_REQUIRED in the output
  
  // For the initial output, remove any preamble explanations
  const commonExplanationStarts = [
    'The program requires', 
    'This program requires',
    'The program needs',
    'This program needs',
    'The program will ask',
    'This program will ask',
    'The program prompts',
    'This program prompts',
    'First, it will',
    'First, the program',
    'First, this program',
    'The code requires',
    'This code requires',
    'This code will',
    'The code will',
    'When executed,',
    'When run,',
    'Running this',
    'This is a program',
    'This is a simple program',
    'This code',
    'The code'
  ];
  
  // Find the first occurrence of any explanation pattern
  let firstExplanationIndex = output.length;
  for (const pattern of commonExplanationStarts) {
    const idx = output.indexOf(pattern);
    if (idx !== -1 && idx < firstExplanationIndex) {
      firstExplanationIndex = idx;
    }
  }
  
  // If we found an explanation at the start, get the first proper output line after it
  if (firstExplanationIndex < output.length) {
    // Split output into lines
    const lines = output.split('\n');
    
    // Find the first line that looks like an actual prompt
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('enter') || 
          line.includes('input') || 
          line.includes('type') ||
          line.includes('?') ||
          line.includes(':')) {
        // We found what's likely an input prompt - return from here onwards and mark it as requiring input
        const remainingOutput = lines.slice(i).join('\n').trim();
        return '[INPUT_REQUIRED]' + remainingOutput;
      }
    }
  }
  
  // Remove leading "Output:" or "Result:" text
  output = output.replace(/^(Output|Result):\s*/i, '');
  output = output.replace(/^The output is:\s*/i, '');
  output = output.replace(/^Program output:\s*/i, '');
  
  // Remove common explanations
  output = output.replace(/^Here is the output of the code:\s*/i, '');
  output = output.replace(/^When executed, the output of this code is:\s*/i, '');
  output = output.replace(/^This code (would )?output(s)?:\s*/i, '');
  output = output.replace(/^The program (would )?output(s)?:\s*/i, '');
  output = output.replace(/^Running this program (would )?output(s)?:\s*/i, '');
  
  // Remove explanation sentences
  output = output.replace(/^The program needs.*$/im, '');
  output = output.replace(/^First, it will.*$/im, '');
  output = output.replace(/^After receiving.*$/im, '');
  output = output.replace(/^The program is waiting.*$/im, '');
  
  // Remove any explanations that might appear at the end
  output = output.replace(/\n\nExplanation:[\s\S]*$/i, '');
  output = output.replace(/\n\nNote:[\s\S]*$/i, '');
  
  // Remove any trailing "Code executed successfully" type messages
  output = output.replace(/\n(Code|Program) (executed|completed|finished|ran) successfully\.?\s*$/i, '');
  
  // Look for common input patterns at the end of output
  const lastLine = output.split('\n').pop() || '';
  if (lastLine.toLowerCase().includes('enter') || 
      lastLine.toLowerCase().includes('input') || 
      lastLine.includes('?') || 
      (lastLine.includes(':') && !lastLine.includes('Error:') && !lastLine.includes('Exception:'))) {
    // If the last line looks like an input prompt, mark it as requiring input
    return '[INPUT_REQUIRED]' + output;
  }
  
  return output.trim();
}; 