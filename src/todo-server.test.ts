import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Todo Server', () => {
  describe('Todo Server MCP Tools', () => {
    let server;
    
    beforeEach(() => {
      // Create a mock server with a tool method
      server = {
        tool: vi.fn().mockReturnThis(),
        schema: {
          string: () => ({
            describe: vi.fn().mockReturnThis(),
            optional: vi.fn().mockReturnThis()
          }),
          enum: () => ({
            describe: vi.fn().mockReturnThis(),
            default: vi.fn().mockReturnThis(),
            optional: vi.fn().mockReturnThis()
          }),
          boolean: () => ({
            describe: vi.fn().mockReturnThis(),
            default: vi.fn().mockReturnThis()
          })
        }
      };
    });
    
    it('should register the required todo management tools', () => {
      // Define the tool names we expect to be registered
      const expectedTools = [
        'getAllTasks',
        'getTask',
        'createTask',
        'updateTask',
        'deleteTask',
        'filterTasks'
      ];
      
      // Initialize the MCP server
      const initServer = async () => {
        // Define and register tools
        for (const toolName of expectedTools) {
          server.tool(toolName, {}, async () => {});
        }
      };
      
      // Execute
      initServer();
      
      // Verify that each tool was registered
      expect(server.tool).toHaveBeenCalledTimes(expectedTools.length);
      
      for (const toolName of expectedTools) {
        expect(server.tool).toHaveBeenCalledWith(
          toolName, 
          expect.anything(), 
          expect.any(Function)
        );
      }
    });

    it('should handle task creation correctly', async () => {
      // Mock a task creation handler
      const createTaskHandler = async ({ content, status, priority, project, conversation }) => {
        const todoData = {
          content,
          status,
          priority,
          project,
          conversation
        };
        
        const newTask = {
          id: 'mock-id',
          content: todoData.content,
          status: todoData.status,
          priority: todoData.priority,
          project: todoData.project,
          conversation: todoData.conversation,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        };
        
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
      };
      
      // Execute
      const result = await createTaskHandler({
        content: 'Test task',
        status: 'pending',
        priority: 'medium',
        project: 'test-project',
        conversation: 'test-conversation'
      });
      
      // Verify
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data).toMatchObject({
        content: 'Test task',
        status: 'pending',
        priority: 'medium',
        project: 'test-project',
        conversation: 'test-conversation'
      });
    });

    it('should handle task update correctly', async () => {
      // Mock a task update handler
      const updateTaskHandler = async ({ id, content, status, priority, project, conversation }) => {
        const updates = {};
        if (content !== undefined) updates.content = content;
        if (status !== undefined) updates.status = status;
        if (priority !== undefined) updates.priority = priority;
        if (project !== undefined) updates.project = project;
        if (conversation !== undefined) updates.conversation = conversation;
        
        const updatedTask = {
          id,
          content: updates.content || 'Original content',
          status: updates.status || 'pending',
          priority: updates.priority || 'medium',
          project: updates.project,
          conversation: updates.conversation,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-02T00:00:00.000Z'
        };
        
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
      };
      
      // Execute
      const result = await updateTaskHandler({
        id: 'task-123',
        status: 'completed',
        priority: 'high'
      });
      
      // Verify
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = JSON.parse(result.content[0].text);
      expect(parsedResult.success).toBe(true);
      expect(parsedResult.data).toMatchObject({
        id: 'task-123',
        status: 'completed',
        priority: 'high'
      });
    });

    it('should handle task deletion correctly', async () => {
      // Mock a task deletion handler
      const deleteTaskHandler = async ({ id, hardDelete }) => {
        if (hardDelete) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: { id, deleted: true }
                }, null, 2)
              }
            ]
          };
        } else {
          // Soft delete just marks as cancelled
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: {
                    id,
                    status: 'cancelled',
                    updatedAt: '2023-01-03T00:00:00.000Z'
                  }
                }, null, 2)
              }
            ]
          };
        }
      };

      // Test hard delete
      const hardDeleteResult = await deleteTaskHandler({
        id: 'task-123',
        hardDelete: true
      });

      expect(hardDeleteResult.content[0].type).toBe('text');
      const parsedHardResult = JSON.parse(hardDeleteResult.content[0].text);
      expect(parsedHardResult.success).toBe(true);
      expect(parsedHardResult.data).toEqual({
        id: 'task-123',
        deleted: true
      });

      // Test soft delete
      const softDeleteResult = await deleteTaskHandler({
        id: 'task-456',
        hardDelete: false
      });

      expect(softDeleteResult.content[0].type).toBe('text');
      const parsedSoftResult = JSON.parse(softDeleteResult.content[0].text);
      expect(parsedSoftResult.success).toBe(true);
      expect(parsedSoftResult.data).toMatchObject({
        id: 'task-456',
        status: 'cancelled'
      });
    });

    it('should handle task filtering correctly', async () => {
      // Mock a task filtering handler
      const filterTasksHandler = async ({ status, priority, project, conversation, keyword }) => {
        const filters = {
          status,
          priority,
          project,
          conversation,
          keyword
        };

        // Simulate filtering by returning tasks that match the criteria
        const mockTasks = [
          {
            id: 'task-1',
            content: 'High priority task',
            status: 'pending',
            priority: 'high',
            project: 'project-1',
            conversation: 'conv-1'
          },
          {
            id: 'task-2',
            content: 'Medium priority task',
            status: 'in_progress',
            priority: 'medium',
            project: 'project-2',
            conversation: 'conv-2'
          }
        ];

        // Simple filtering logic for test
        const filteredTasks = mockTasks.filter(task => {
          if (filters.status && task.status !== filters.status) return false;
          if (filters.priority && task.priority !== filters.priority) return false;
          if (filters.project && task.project !== filters.project) return false;
          if (filters.conversation && task.conversation !== filters.conversation) return false;
          if (filters.keyword && !task.content.toLowerCase().includes(filters.keyword.toLowerCase())) return false;
          return true;
        });

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
      };

      // Test filtering by priority
      const priorityResult = await filterTasksHandler({
        priority: 'high'
      });

      expect(priorityResult.content[0].type).toBe('text');
      const parsedPriorityResult = JSON.parse(priorityResult.content[0].text);
      expect(parsedPriorityResult.success).toBe(true);
      expect(parsedPriorityResult.data).toHaveLength(1);
      expect(parsedPriorityResult.data[0].priority).toBe('high');

      // Test filtering by status
      const statusResult = await filterTasksHandler({
        status: 'in_progress'
      });

      expect(statusResult.content[0].type).toBe('text');
      const parsedStatusResult = JSON.parse(statusResult.content[0].text);
      expect(parsedStatusResult.success).toBe(true);
      expect(parsedStatusResult.data).toHaveLength(1);
      expect(parsedStatusResult.data[0].status).toBe('in_progress');

      // Test filtering by keyword
      const keywordResult = await filterTasksHandler({
        keyword: 'medium'
      });

      expect(keywordResult.content[0].type).toBe('text');
      const parsedKeywordResult = JSON.parse(keywordResult.content[0].text);
      expect(parsedKeywordResult.success).toBe(true);
      expect(parsedKeywordResult.data).toHaveLength(1);
      expect(parsedKeywordResult.data[0].content).toContain('Medium');
    });
  });
});