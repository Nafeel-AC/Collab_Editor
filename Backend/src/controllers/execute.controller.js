import fetch from 'node-fetch';

// Execute code using Gemini API
export const executeCode = async (req, res) => {
  try {
    const { prompt, language, userInputs = [] } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }
    
    console.log(`Executing ${language} code with Gemini...`);
    
    // Use the Google Gemini API
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ message: "Gemini API key not configured" });
    }

    // First, analyze if the code needs user input
    let needsInput = false;
    let inputPrompt = null;
    
    // Extract just the code part from the prompt
    const codePart = prompt.split('Code to execute:')[1]?.trim() || prompt;
    
    if (userInputs.length === 0) {
      // Check for input requirements first
      const analysisPrompt = `
You're analyzing this ${language} code to determine if it requires user input (like input(), prompt(), readline, etc).
If input is required, respond with EXACTLY: "INPUT_REQUIRED: <prompt to show user>"
If NO input is required, respond with EXACTLY: "NO_INPUT_REQUIRED"
Don't explain anything - ONLY respond with one of those exact formats.

${codePart}
`;

      const analysisResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: analysisPrompt }] }],
          generationConfig: { temperature: 0.0 }
        })
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error("Gemini API error during input analysis:", errorText);
        return res.status(500).json({ 
          message: "Failed to analyze code input requirements",
          error: errorText 
        });
      }

      const analysisData = await analysisResponse.json();
      let analysisResult = "";
      
      if (analysisData.candidates && analysisData.candidates.length > 0 && 
          analysisData.candidates[0].content && analysisData.candidates[0].content.parts) {
        analysisResult = analysisData.candidates[0].content.parts
          .filter(part => part.text)
          .map(part => part.text)
          .join("").trim();
      }

      console.log("Input analysis result:", analysisResult);
      
      if (analysisResult.startsWith("INPUT_REQUIRED:")) {
        needsInput = true;
        inputPrompt = analysisResult.substring("INPUT_REQUIRED:".length).trim();
        
        // Return early to request input from user
        return res.status(200).json({ 
          status: "input_required",
          inputPrompt 
        });
      }
    }
    
    // Create a better prompt for pure execution without explanations
    let executionPrompt;
    
    if (language === 'javascript') {
      executionPrompt = `
You are a JavaScript interpreter. Execute this code and return ONLY what would appear in the console (console.log outputs, errors, etc).
DO NOT include any explanations, markdown formatting, or additional text.
NEVER use backticks (\\\`\\\`\\\`) or phrases like "Output:" - ONLY the raw program output.

${userInputs.length > 0 ? `When the program requests user input, use these values in order:
${userInputs.map((input, index) => `Input ${index + 1}: ${input}`).join('\n')}` : ''}

${codePart}
`;
    } else if (language === 'python') {
      executionPrompt = `
You are a Python interpreter. Execute this code and return ONLY what would appear in the console (print outputs, errors, etc).
DO NOT include any explanations, markdown formatting, or additional text.
NEVER use backticks (\\\`\\\`\\\`) or phrases like "Output:" - ONLY the raw program output.

${userInputs.length > 0 ? `When the program calls input(), use these values in order:
${userInputs.map((input, index) => `Input ${index + 1}: ${input}`).join('\n')}` : ''}

${codePart}
`;
    } else if (language === 'cpp') {
      executionPrompt = `
You are a C++ compiler and runtime. Compile and execute this code and return ONLY what would appear in the console (cout outputs, errors, etc).
DO NOT include any explanations, markdown formatting, or additional text.
NEVER use backticks (\\\`\\\`\\\`) or phrases like "Output:" - ONLY the raw program output.

${userInputs.length > 0 ? `When the program requests user input (cin, etc), use these values in order:
${userInputs.map((input, index) => `Input ${index + 1}: ${input}`).join('\n')}` : ''}

${codePart}
`;
    } else if (language === 'java') {
      executionPrompt = `
You are a Java compiler and runtime. Compile and execute this code and return ONLY what would appear in the console (System.out.println outputs, errors, etc).
DO NOT include any explanations, markdown formatting, or additional text.
NEVER use backticks (\\\`\\\`\\\`) or phrases like "Output:" - ONLY the raw program output.

${userInputs.length > 0 ? `When the program requests user input (Scanner, etc), use these values in order:
${userInputs.map((input, index) => `Input ${index + 1}: ${input}`).join('\n')}` : ''}

${codePart}
`;
    } else {
      // Generic prompt for other languages
      executionPrompt = `
You are a ${language} interpreter. Execute this code and return ONLY the raw program output.
DO NOT include any explanations, markdown formatting, or additional text.
NEVER use backticks (\\\`\\\`\\\`) or phrases like "Output:" - ONLY the raw program output.

${userInputs.length > 0 ? `When the program requests user input, use these values in order:
${userInputs.map((input, index) => `Input ${index + 1}: ${input}`).join('\n')}` : ''}

${codePart}
`;
    }
    
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
    
    console.log("Code execution completed");
    res.status(200).json({ 
      status: "completed",
      output 
    });
  } catch (error) {
    console.error("Error executing code:", error);
    res.status(500).json({ 
      message: "Failed to execute code",
      error: error.message 
    });
  }
};

// Helper function to clean Gemini output
const cleanGeminiOutput = (output, language) => {
  // Remove markdown code blocks
  output = output.replace(/```[\w]*\n/g, '').replace(/```$/g, '');
  
  // Remove leading "Output:" or "Result:" text
  output = output.replace(/^(Output|Result):\s*/i, '');
  output = output.replace(/^The output is:\s*/i, '');
  output = output.replace(/^Program output:\s*/i, '');
  
  // Remove common explanations
  output = output.replace(/^Here is the output of the code:\s*/i, '');
  output = output.replace(/^When executed, the output of this code is:\s*/i, '');
  output = output.replace(/^This code (would )?output(s)?:\s*/i, '');
  
  // Remove any explanations that might appear at the end
  output = output.replace(/\n\nExplanation:[\s\S]*$/i, '');
  output = output.replace(/\n\nNote:[\s\S]*$/i, '');
  
  // Remove any trailing "Code executed successfully" type messages
  output = output.replace(/\n(Code|Program) (executed|completed|finished|ran) successfully\.?\s*$/i, '');
  
  // Remove explanatory text at the beginning or end
  const lines = output.split('\n');
  let startLine = 0;
  let endLine = lines.length - 1;
  
  // Find the first line that looks like program output
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() && 
        !lines[i].includes('Execute') && 
        !lines[i].includes('example') &&
        !lines[i].includes('Output:') &&
        !lines[i].includes('Result:')) {
      startLine = i;
      break;
    }
  }
  
  // Find the last line that looks like program output
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim() && 
        !lines[i].includes('executed') && 
        !lines[i].includes('completed') &&
        !lines[i].includes('successfully')) {
      endLine = i;
      break;
    }
  }
  
  return lines.slice(startLine, endLine + 1).join('\n');
}; 