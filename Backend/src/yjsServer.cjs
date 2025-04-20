const WebSocket = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');
const url = require('url');

const initYjsServer = (server) => {
  // Create a WebSocket server for Yjs
  const wss = new WebSocket.Server({ noServer: true });
  
  // Handle WebSocket connections
  wss.on('connection', (conn, req) => {
    // Extract the document name from the URL path
    const parsedUrl = url.parse(req.url, true);
    const docName = parsedUrl.pathname.slice(1) || 'default';
    
    console.log(`Yjs client connected to document: ${docName}`);
    
    // Set up the WebSocket connection for Yjs
    setupWSConnection(conn, req, { docName });
    
    conn.on('close', () => {
      console.log(`Yjs client disconnected from document: ${docName}`);
    });
  });
  
  // Handle upgrade requests
  server.on('upgrade', (request, socket, head) => {
    // Only handle WebSocket connections for Yjs
    if (request.url.startsWith('/yjs')) {
      // Remove the /yjs prefix from the URL
      request.url = request.url.replace(/^\/yjs/, '');
      
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });
  
  console.log('Yjs WebSocket server initialized');
  return wss;
};

module.exports = { initYjsServer };
