# Claude Todo Manager

A specialized todo management system designed to work with Claude Code's built-in task system. This MCP (Model Context Protocol) server enables Claude to create, manage, and track tasks while keeping them persistent and organized.

## What This Does

This package lets Claude Code manage your todos by:

- Creating and maintaining a persistent todo list in your Claude directory structure
- Tracking tasks across conversations and projects
- Integrating seamlessly with Claude Code's built-in task management
- Managing task priorities, statuses, and categories

## Installation

```bash
npm install @jasonkneen/claude-todo-mcp
```

## Quick Start

```bash
# Run the todo manager server
npm start

# Or explicitly run the todo server
npm run todo
```

## Using with Claude Code

Once the server is running, Claude can manage your todos through its built-in task system. The MCP server provides the following capabilities:

- **Create tasks**: Add new todos with priorities and project assignments
- **Track tasks**: View all pending, in-progress, and completed tasks
- **Update tasks**: Modify task status, priority, and content
- **Filter tasks**: Search for tasks by status, priority, project, or keywords
- **Organize by project**: Group related tasks together

### Example Tasks Claude Can Manage

- Research topics for future discussion
- Complete code reviews
- Follow up on questions from previous conversations
- Track bugs that need fixing
- Organize feature ideas

## Technical Details

### Todo Storage

Tasks are stored in JSON files within the Claude directory structure (`~/.claude/todos/`), organized by:

- Default todos: `~/.claude/todos/default.json`
- Project-specific todos: `~/.claude/todos/{project-name}.json`

### Available MCP Tools

The server exposes the following tools to Claude:

- `getAllTasks`: Retrieve all todo items
- `getTask`: Get details for a specific task
- `createTask`: Create a new todo item
- `updateTask`: Modify an existing task
- `deleteTask`: Remove a task (or mark as cancelled)
- `filterTasks`: Search for tasks matching specific criteria

## Testing

```bash
npm run test
```

## Development

This project is built with a fluent MCP interface that makes it easy to extend with additional functionality. To develop custom features, check out the source code in the `src` directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.