# Goalie

> [!NOTE]
> This project is just an experiment and not intended to be directly used right now. I hope it may be of some inspiration to someone though. 

A TUI/CLI app to help you accomplish your goals by breaking them down into actionable tasks.

## Features

- **Goal Management**: Create and track goals with completion percentages
- **Task Breakdown**: Automatically break down goals into actionable tasks using Claude Code integration
- **Smart Prioritization**: Get recommended tasks based on priority, difficulty, and dependencies
- **Markdown Storage**: All data stored as human-readable markdown files
- **CLI Interface**: Full command-line interface for all operations
- **TUI Interface**: Interactive terminal interface (when supported)

## Installation

1. Ensure you have mise installed
2. Clone this repository
3. Run `mise install` to download dependencies
3. Run `mise run build` to compile the binary

## Usage

### Initialize Goalie

```bash
deno run --allow-all src/main.ts init
```

### Create a Goal

```bash
deno run --allow-all src/main.ts create-goal "Learn Spanish" --description "Become conversational in Spanish" --due-date "2024-12-31"
```

### List Goals

```bash
deno run --allow-all src/main.ts list-goals
```

### Get Recommended Task

```bash
deno run --allow-all src/main.ts work
```

### Complete a Task

```bash
deno run --allow-all src/main.ts complete-task 1
```

### Check Status

```bash
deno run --allow-all src/main.ts status
```

### Launch TUI Interface

```bash
deno run --allow-all src/main.ts tui
```

## CLI Commands

- `init` - Initialize goalie in the current directory
- `create-goal <name>` - Create a new goal and break it down into tasks
- `list-goals` - List all goals with completion status
- `work` - Get the recommended task to work on
- `complete-task <taskId>` - Mark a task as completed
- `list-tasks <goalId>` - List tasks for a goal
- `status` - Show overall status and progress
- `tui` - Launch the interactive TUI interface

## File Structure

```
goals/
├── <goal-id>/
│   ├── goal.json          # Goal metadata
│   ├── 1.md              # Task 1
│   ├── 2.md              # Task 2
│   └── 1.1.md            # Subtask 1.1
```

## Task Properties

Each task includes:
- **Title**: Clear, actionable description
- **Priority**: high/medium/low
- **Difficulty**: 1-10 scale
- **Time Estimate**: in minutes
- **Dependencies**: other tasks that must be completed first
- **Status**: todo/in_progress/completed

## Claude Code Integration

When creating goals, Goalie generates prompts for Claude Code to help break down complex goals into actionable tasks. The integration creates detailed task breakdowns with proper prioritization and time estimates.

## Development

```bash
# Run in development mode
mise run dev

# Build binary
mise run build

# Run directly
mise run start
# or
deno run --allow-all src/main.ts --help
```

## Requirements

- Deno 2.4+
- Claude Code (for goal breakdown functionality)
