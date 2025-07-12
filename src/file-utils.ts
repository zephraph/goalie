import { join, type dirname } from '@std/path';
import { ensureDir, exists } from '@std/fs';
import type { Goal, Task } from './types.ts';

export class FileUtils {
  private goalsDir: string;

  constructor(goalsDir = './goals') {
    this.goalsDir = goalsDir;
  }

  async init(): Promise<void> {
    await ensureDir(this.goalsDir);
  }

  async createGoalDirectory(goalId: string): Promise<string> {
    const goalDir = join(this.goalsDir, goalId);
    await ensureDir(goalDir);
    return goalDir;
  }

  async goalExists(goalId: string): Promise<boolean> {
    const goalDir = join(this.goalsDir, goalId);
    return await exists(goalDir);
  }

  async saveGoal(goal: Goal): Promise<void> {
    const goalDir = await this.createGoalDirectory(goal.id);
    const goalFile = join(goalDir, 'goal.json');
    await Deno.writeTextFile(goalFile, JSON.stringify(goal, null, 2));
  }

  async loadGoal(goalId: string): Promise<Goal | null> {
    const goalFile = join(this.goalsDir, goalId, 'goal.json');
    if (!await exists(goalFile)) {
      return null;
    }
    const content = await Deno.readTextFile(goalFile);
    const goal = JSON.parse(content);
    // Convert date strings back to Date objects
    goal.createdDate = new Date(goal.createdDate);
    if (goal.dueDate) goal.dueDate = new Date(goal.dueDate);
    return goal;
  }

  async listGoals(): Promise<Goal[]> {
    const goals: Goal[] = [];
    try {
      for await (const dirEntry of Deno.readDir(this.goalsDir)) {
        if (dirEntry.isDirectory) {
          const goal = await this.loadGoal(dirEntry.name);
          if (goal) {
            goals.push(goal);
          }
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [];
      }
      throw error;
    }
    return goals;
  }

  async saveTask(goalId: string, task: Task): Promise<void> {
    const goalDir = join(this.goalsDir, goalId);
    await ensureDir(goalDir);
    const taskFile = join(goalDir, `${task.id}.md`);
    
    const markdown = this.taskToMarkdown(task);
    await Deno.writeTextFile(taskFile, markdown);
  }

  async loadTask(goalId: string, taskId: string): Promise<Task | null> {
    const taskFile = join(this.goalsDir, goalId, `${taskId}.md`);
    if (!await exists(taskFile)) {
      return null;
    }
    const content = await Deno.readTextFile(taskFile);
    return this.markdownToTask(taskId, content);
  }

  async listTasksForGoal(goalId: string): Promise<Task[]> {
    const tasks: Task[] = [];
    const goalDir = join(this.goalsDir, goalId);
    
    try {
      for await (const dirEntry of Deno.readDir(goalDir)) {
        if (dirEntry.isFile && dirEntry.name.endsWith('.md') && dirEntry.name !== 'goal.md') {
          const taskId = dirEntry.name.replace('.md', '');
          const task = await this.loadTask(goalId, taskId);
          if (task) {
            tasks.push(task);
          }
        }
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        return [];
      }
      throw error;
    }
    
    return tasks;
  }

  private taskToMarkdown(task: Task): string {
    let md = `# ${task.title}\n\n`;
    md += `**Status:** ${task.status}\n`;
    md += `**Priority:** ${task.priority}\n`;
    md += `**Difficulty:** ${task.difficulty}/10\n`;
    md += `**Time Estimate:** ${task.timeEstimate} minutes\n`;
    
    if (task.dependencies.length > 0) {
      md += `**Dependencies:** ${task.dependencies.join(', ')}\n`;
    }
    
    if (task.dueDate) {
      md += `**Due Date:** ${task.dueDate.toISOString().split('T')[0]}\n`;
    }
    
    if (task.recommendedStartDate) {
      md += `**Recommended Start Date:** ${task.recommendedStartDate.toISOString().split('T')[0]}\n`;
    }
    
    if (task.completedDate) {
      md += `**Completed Date:** ${task.completedDate.toISOString().split('T')[0]}\n`;
    }
    
    if (task.parentTask) {
      md += `**Parent Task:** ${task.parentTask}\n`;
    }
    
    if (task.subtasks.length > 0) {
      md += `**Subtasks:** ${task.subtasks.join(', ')}\n`;
    }
    
    md += `\n## Description\n\n${task.description}\n`;
    
    return md;
  }

  private markdownToTask(taskId: string, markdown: string): Task {
    const lines = markdown.split('\n');
    const task: Task = {
      id: taskId,
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      difficulty: 1,
      timeEstimate: 0,
      dependencies: [],
      subtasks: []
    };

    let inDescription = false;
    let descriptionLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('# ')) {
        task.title = line.substring(2).trim();
      } else if (line.startsWith('**Status:**')) {
        const statusText = line.split(':')[1].trim().replace(/^\*\*|\*\*$/g, '').trim();
        task.status = statusText as Task['status'];
      } else if (line.startsWith('**Priority:**')) {
        const priorityText = line.split(':')[1].trim().replace(/^\*\*|\*\*$/g, '').trim();
        task.priority = priorityText as Task['priority'];
      } else if (line.startsWith('**Difficulty:**')) {
        const difficultyText = line.split(':')[1].split('/')[0].trim();
        task.difficulty = parseInt(difficultyText) || 1;
      } else if (line.startsWith('**Time Estimate:**')) {
        task.timeEstimate = parseInt(line.split(':')[1].split(' ')[1]);
      } else if (line.startsWith('**Dependencies:**')) {
        const deps = line.split(':')[1].trim();
        task.dependencies = deps ? deps.split(', ') : [];
      } else if (line.startsWith('**Due Date:**')) {
        task.dueDate = new Date(line.split(':')[1].trim());
      } else if (line.startsWith('**Recommended Start Date:**')) {
        task.recommendedStartDate = new Date(line.split(':')[1].trim());
      } else if (line.startsWith('**Completed Date:**')) {
        task.completedDate = new Date(line.split(':')[1].trim());
      } else if (line.startsWith('**Parent Task:**')) {
        task.parentTask = line.split(':')[1].trim();
      } else if (line.startsWith('**Subtasks:**')) {
        const subtasks = line.split(':')[1].trim();
        task.subtasks = subtasks ? subtasks.split(', ') : [];
      } else if (line.trim() === '## Description') {
        inDescription = true;
      } else if (inDescription && line.trim()) {
        descriptionLines.push(line);
      }
    }

    task.description = descriptionLines.join('\n').trim();
    return task;
  }
}