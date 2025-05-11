import { createMCP } from './fluent-mcp.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { existsSync, mkdirSync } from 'fs';

// Constants
const CLAUDE_DIR = path.join(os.homedir(), '.claude');
const TODOS_DIR = path.join(CLAUDE_DIR, 'todos');
const DEFAULT_TODOS_FILE = path.join(TODOS_DIR, 'default.json');

// Define todo interfaces
interface Todo {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  project?: string;
  conversation?: string;
  createdAt: string;
  updatedAt: string;
}

interface TodoFilters {
  status?: string;
  priority?: string;
  project?: string;
  conversation?: string;
  keyword?: string;
}

// TodoStore class to handle all todo operations
class TodoStore {
  constructor() {
    this.ensureDirectoriesExist();
  }

  // Ensure required directories exist
  ensureDirectoriesExist(): void {
    if (!existsSync(CLAUDE_DIR)) {
      mkdirSync(CLAUDE_DIR, { recursive: true });
    }
    
    if (!existsSync(TODOS_DIR)) {
      mkdirSync(TODOS_DIR, { recursive: true });
    }
    
    if (!existsSync(DEFAULT_TODOS_FILE)) {
      fs.writeFile(DEFAULT_TODOS_FILE, '[]', 'utf8');
    }
  }

  // Get all todo files
  async getTodoFiles(): Promise<string[]> {
    const files = await fs.readdir(TODOS_DIR);
    return files.filter(file => file.endsWith('.json'));
  }

  // Read todos from a file
  async readTodosFile(filePath: string): Promise<Todo[]> {
    try {
      if (!existsSync(filePath)) {
        return [];
      }
      
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading todos file ${filePath}:`, error);
      return [];
    }
  }

  // Write todos to a file
  async writeTodosFile(filePath: string, todos: Todo[]): Promise<void> {
    try {
      await fs.writeFile(filePath, JSON.stringify(todos, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error writing todos file ${filePath}:`, error);
      throw error;
    }
  }

  // Get all todos from all files
  async getAllTodos(): Promise<Todo[]> {
    const files = await this.getTodoFiles();
    const allTodos: Todo[] = [];
    
    for (const file of files) {
      const filePath = path.join(TODOS_DIR, file);
      const todos = await this.readTodosFile(filePath);
      allTodos.push(...todos);
    }
    
    return allTodos;
  }

  // Get a todo by ID
  async getTodoById(id: string): Promise<Todo | null> {
    const files = await this.getTodoFiles();
    
    for (const file of files) {
      const filePath = path.join(TODOS_DIR, file);
      const todos = await this.readTodosFile(filePath);
      const todo = todos.find(todo => todo.id === id);
      
      if (todo) {
        return todo;
      }
    }
    
    return null;
  }

  // Create a new todo
  async createTodo(todoData: Partial<Todo>): Promise<Todo> {
    let filePath = DEFAULT_TODOS_FILE;
    
    if (todoData.project) {
      const sanitizedProject = todoData.project.replace(/[^a-zA-Z0-9]/g, '-');
      filePath = path.join(TODOS_DIR, `${sanitizedProject}.json`);
    }
    
    const todos = await this.readTodosFile(filePath);
    
    const newTodo: Todo = {
      id: this.generateUUID(),
      content: todoData.content || '',
      status: todoData.status || 'pending',
      priority: todoData.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...(todoData.project && { project: todoData.project }),
      ...(todoData.conversation && { conversation: todoData.conversation })
    } as Todo;
    
    todos.push(newTodo);
    await this.writeTodosFile(filePath, todos);
    
    return newTodo;
  }

  // Update an existing todo
  async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo | null> {
    const files = await this.getTodoFiles();
    
    for (const file of files) {
      const filePath = path.join(TODOS_DIR, file);
      const todos = await this.readTodosFile(filePath);
      const index = todos.findIndex(todo => todo.id === id);
      
      if (index !== -1) {
        const updatedTodo = {
          ...todos[index],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        
        todos[index] = updatedTodo;
        await this.writeTodosFile(filePath, todos);
        
        return updatedTodo;
      }
    }
    
    return null;
  }

  // Delete a todo
  async deleteTodo(id: string, hardDelete = false): Promise<Todo | { id: string, deleted: boolean } | null> {
    const files = await this.getTodoFiles();
    
    for (const file of files) {
      const filePath = path.join(TODOS_DIR, file);
      const todos = await this.readTodosFile(filePath);
      const index = todos.findIndex(todo => todo.id === id);
      
      if (index !== -1) {
        if (hardDelete) {
          const deletedTodo = todos[index];
          todos.splice(index, 1);
          await this.writeTodosFile(filePath, todos);
          return { id, deleted: true };
        } else {
          todos[index].status = 'cancelled';
          todos[index].updatedAt = new Date().toISOString();
          await this.writeTodosFile(filePath, todos);
          return todos[index];
        }
      }
    }
    
    return null;
  }

  // Filter todos by criteria
  async filterTodos(filters: TodoFilters): Promise<Todo[]> {
    const allTodos = await this.getAllTodos();
    
    return allTodos.filter(todo => {
      if (filters.status && todo.status !== filters.status) return false;
      if (filters.priority && todo.priority !== filters.priority) return false;
      if (filters.project && todo.project !== filters.project) return false;
      if (filters.conversation && todo.conversation !== filters.conversation) return false;
      if (filters.keyword && !todo.content.toLowerCase().includes(filters.keyword.toLowerCase())) return false;
      return true;
    });
  }

  // Generate a UUID
  generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Initialize the MCP server
const server = createMCP('Claude Todo API', '1.0.0');
const todoStore = new TodoStore();

// Initialize the server
async function initServer() {
  // Add tools for task management
  
  // Get all tasks
  server.tool(
    'getAllTasks',
    {},
    async () => {
      try {
        const allTasks = await todoStore.getAllTodos();
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: allTasks,
                count: allTasks.length
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error getting all tasks:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to get tasks',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Get task by ID
  server.tool(
    'getTask',
    {
      id: z.string().describe('The ID of the task to retrieve')
    },
    async ({ id }: { id: string }) => {
      try {
        const task = await todoStore.getTodoById(id);
        
        if (task) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: task
                }, null, 2)
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Task not found',
                id
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error getting task:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to get task',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Create a new task
  server.tool(
    'createTask',
    {
      content: z.string().describe('The content of the task'),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending').describe('The status of the task'),
      priority: z.enum(['high', 'medium', 'low']).default('medium').describe('The priority of the task'),
      project: z.string().optional().describe('The project associated with the task'),
      conversation: z.string().optional().describe('The conversation associated with the task')
    },
    async ({ content, status, priority, project, conversation }: { 
      content: string; 
      status: 'pending' | 'in_progress' | 'completed' | 'cancelled'; 
      priority: 'high' | 'medium' | 'low'; 
      project?: string; 
      conversation?: string 
    }) => {
      try {
        const todoData = {
          content,
          status,
          priority,
          project,
          conversation
        };
        
        const newTask = await todoStore.createTodo(todoData);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: newTask
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error creating task:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to create task',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Update a task
  server.tool(
    'updateTask',
    {
      id: z.string().describe('The ID of the task to update'),
      content: z.string().optional().describe('The content of the task'),
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('The status of the task'),
      priority: z.enum(['high', 'medium', 'low']).optional().describe('The priority of the task'),
      project: z.string().optional().describe('The project associated with the task'),
      conversation: z.string().optional().describe('The conversation associated with the task')
    },
    async ({ id, content, status, priority, project, conversation }: {
      id: string;
      content?: string;
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'high' | 'medium' | 'low';
      project?: string;
      conversation?: string;
    }) => {
      try {
        const updates: Partial<Todo> = {};
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status as Todo['status'];
        if (priority !== undefined) updates.priority = priority as Todo['priority'];
        if (project !== undefined) updates.project = project;
        if (conversation !== undefined) updates.conversation = conversation;
        
        const updatedTask = await todoStore.updateTodo(id, updates);
        
        if (updatedTask) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: updatedTask
                }, null, 2)
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Task not found',
                id
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error updating task:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to update task',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Delete a task
  server.tool(
    'deleteTask',
    {
      id: z.string().describe('The ID of the task to delete'),
      hardDelete: z.boolean().default(false).describe('Whether to permanently delete the task or just mark it as cancelled')
    },
    async ({ id, hardDelete }: { id: string; hardDelete: boolean }) => {
      try {
        const result = await todoStore.deleteTodo(id, hardDelete);
        
        if (result) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: result
                }, null, 2)
              }
            ]
          };
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Task not found',
                id
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error deleting task:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to delete task',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Filter tasks
  server.tool(
    'filterTasks',
    {
      status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional().describe('Filter by task status'),
      priority: z.enum(['high', 'medium', 'low']).optional().describe('Filter by task priority'),
      project: z.string().optional().describe('Filter by project'),
      conversation: z.string().optional().describe('Filter by conversation'),
      keyword: z.string().optional().describe('Filter by keyword in content')
    },
    async ({ status, priority, project, conversation, keyword }: {
      status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'high' | 'medium' | 'low';
      project?: string;
      conversation?: string;
      keyword?: string;
    }) => {
      try {
        const filters = {
          status,
          priority,
          project,
          conversation,
          keyword
        };
        
        const filteredTasks = await todoStore.filterTodos(filters);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                data: filteredTasks,
                count: filteredTasks.length
              }, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error('Error filtering tasks:', error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: 'Failed to filter tasks',
                message: (error as Error).message
              }, null, 2)
            }
          ]
        };
      }
    }
  );
  
  // Start the server
  return server.stdio().start();
}

// Initialize and start the server
initServer().catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});

// Export the server for external use
export default server;
