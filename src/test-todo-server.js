import { McpClient } from '@modelcontextprotocol/sdk/client/mcp.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the todo server script
const serverPath = path.join(__dirname, 'todo-server.js');

// Start the todo server as a child process
console.log('Starting todo server...');
const serverProcess = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Handle server output
serverProcess.stdout.on('data', (data) => {
  console.log(`Server stdout: ${data}`);
});

serverProcess.stderr.on('data', (data) => {
  console.error(`Server stderr: ${data}`);
});

// Create an MCP client
const transport = new StdioClientTransport({
  input: serverProcess.stdout,
  output: serverProcess.stdin
});

const client = new McpClient({ transport });

// Connect to the server
async function runTests() {
  try {
    console.log('Connecting to server...');
    await client.connect();
    
    console.log('Server info:', client.serverInfo);
    
    // Test creating a task
    console.log('\n--- Test: Create Task ---');
    const createResult = await client.invoke('createTask', {
      content: 'Test task created by MCP client',
      priority: 'high',
      status: 'pending'
    });
    console.log('Create task result:', JSON.parse(createResult.content[0].text));
    
    // Store the task ID for later use
    const taskId = JSON.parse(createResult.content[0].text).data.id;
    
    // Test getting all tasks
    console.log('\n--- Test: Get All Tasks ---');
    const allTasksResult = await client.invoke('getAllTasks', {});
    console.log('All tasks result:', JSON.parse(allTasksResult.content[0].text));
    
    // Test getting a specific task
    console.log('\n--- Test: Get Task by ID ---');
    const getTaskResult = await client.invoke('getTask', { id: taskId });
    console.log('Get task result:', JSON.parse(getTaskResult.content[0].text));
    
    // Test updating a task
    console.log('\n--- Test: Update Task ---');
    const updateResult = await client.invoke('updateTask', {
      id: taskId,
      content: 'Updated test task',
      status: 'in_progress'
    });
    console.log('Update task result:', JSON.parse(updateResult.content[0].text));
    
    // Test filtering tasks
    console.log('\n--- Test: Filter Tasks ---');
    const filterResult = await client.invoke('filterTasks', {
      status: 'in_progress',
      priority: 'high'
    });
    console.log('Filter tasks result:', JSON.parse(filterResult.content[0].text));
    
    // Test deleting a task (soft delete)
    console.log('\n--- Test: Soft Delete Task ---');
    const softDeleteResult = await client.invoke('deleteTask', {
      id: taskId,
      hardDelete: false
    });
    console.log('Soft delete result:', JSON.parse(softDeleteResult.content[0].text));
    
    // Test hard deleting a task
    console.log('\n--- Test: Hard Delete Task ---');
    const hardDeleteResult = await client.invoke('deleteTask', {
      id: taskId,
      hardDelete: true
    });
    console.log('Hard delete result:', JSON.parse(hardDeleteResult.content[0].text));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    // Clean up
    console.log('Terminating server process...');
    serverProcess.kill();
    process.exit(0);
  }
}

// Run the tests
runTests();
