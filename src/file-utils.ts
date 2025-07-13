import { join } from '@std/path';
import { ensureDir, exists } from '@std/fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Goal, Task } from './types.ts';

export class FileUtils {
  private goalsDir: string;

  constructor(goalsDir = './goals') {
    this.goalsDir = goalsDir;
  }

  private parseFrontmatter(content: string): { frontmatter: any; body: string } {
    const lines = content.split('\n');
    if (lines[0] !== '---') {
      return { frontmatter: {}, body: content };
    }

    let endIndex = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        endIndex = i;
        break;
      }
    }

    if (endIndex === -1) {
      return { frontmatter: {}, body: content };
    }

    const frontmatterText = lines.slice(1, endIndex).join('\n');
    const body = lines.slice(endIndex + 1).join('\n').trim();

    try {
      const frontmatter = parseYaml(frontmatterText) || {};
      return { frontmatter, body };
    } catch {
      return { frontmatter: {}, body: content };
    }
  }

  private formatWithFrontmatter(frontmatter: any, body: string): string {
    const yamlStr = stringifyYaml(frontmatter).trim();
    return `---\n${yamlStr}\n---\n\n${body}`;
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
    const goalFile = join(goalDir, 'goal.md');
    
    // Prepare frontmatter data
    const frontmatter = {
      id: goal.id,
      name: goal.name,
      createdDate: goal.createdDate.toISOString(),
      dueDate: goal.dueDate?.toISOString(),
      status: goal.status,
      tasks: goal.tasks,
      completionPercentage: goal.completionPercentage
    };
    
    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
      if (frontmatter[key] === undefined) {
        delete frontmatter[key];
      }
    });
    
    const markdown = this.formatWithFrontmatter(frontmatter, goal.description);
    await Deno.writeTextFile(goalFile, markdown);
  }

  async loadGoal(goalId: string): Promise<Goal | null> {
    // First try to load from markdown file
    let goalFile = join(this.goalsDir, goalId, 'goal.md');
    let usingMarkdown = true;
    
    if (!await exists(goalFile)) {
      // Fall back to JSON for backward compatibility during migration
      goalFile = join(this.goalsDir, goalId, 'goal.json');
      usingMarkdown = false;
      if (!await exists(goalFile)) {
        return null;
      }
    }
    
    const content = await Deno.readTextFile(goalFile);
    
    if (usingMarkdown) {
      const { frontmatter, body } = this.parseFrontmatter(content);
      
      const goal: Goal = {
        id: frontmatter.id || goalId,
        name: frontmatter.name || '',
        description: body,
        createdDate: new Date(frontmatter.createdDate),
        dueDate: frontmatter.dueDate ? new Date(frontmatter.dueDate) : undefined,
        status: frontmatter.status || 'active',
        tasks: frontmatter.tasks || [],
        completionPercentage: frontmatter.completionPercentage || 0
      };
      
      return goal;
    } else {
      // Legacy JSON loading
      const goal = JSON.parse(content);
      goal.createdDate = new Date(goal.createdDate);
      if (goal.dueDate) goal.dueDate = new Date(goal.dueDate);
      
      // Automatically migrate to markdown format
      await this.saveGoal(goal);
      
      // Delete the old JSON file
      await Deno.remove(goalFile);
      
      return goal;
    }
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
    // Prepare frontmatter data
    const frontmatter = {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      difficulty: task.difficulty,
      timeEstimate: task.timeEstimate,
      dependencies: task.dependencies.length > 0 ? task.dependencies : undefined,
      dueDate: task.dueDate?.toISOString().split('T')[0],
      recommendedStartDate: task.recommendedStartDate?.toISOString().split('T')[0],
      completedDate: task.completedDate?.toISOString().split('T')[0],
      parentTask: task.parentTask,
      subtasks: task.subtasks.length > 0 ? task.subtasks : undefined
    };
    
    // Remove undefined values
    Object.keys(frontmatter).forEach(key => {
      if (frontmatter[key] === undefined) {
        delete frontmatter[key];
      }
    });
    
    return this.formatWithFrontmatter(frontmatter, task.description);
  }

  private markdownToTask(taskId: string, markdown: string): Task {
    const { frontmatter, body } = this.parseFrontmatter(markdown);
    
    // If no frontmatter, fall back to parsing the old format
    if (Object.keys(frontmatter).length === 0) {
      return this.legacyMarkdownToTask(taskId, markdown);
    }
    
    const task: Task = {
      id: frontmatter.id || taskId,
      title: frontmatter.title || '',
      description: body,
      status: frontmatter.status || 'todo',
      priority: frontmatter.priority || 'medium',
      difficulty: frontmatter.difficulty || 1,
      timeEstimate: frontmatter.timeEstimate || 0,
      dependencies: frontmatter.dependencies || [],
      subtasks: frontmatter.subtasks || []
    };
    
    if (frontmatter.dueDate) {
      task.dueDate = new Date(frontmatter.dueDate);
    }
    
    if (frontmatter.recommendedStartDate) {
      task.recommendedStartDate = new Date(frontmatter.recommendedStartDate);
    }
    
    if (frontmatter.completedDate) {
      task.completedDate = new Date(frontmatter.completedDate);
    }
    
    if (frontmatter.parentTask) {
      task.parentTask = frontmatter.parentTask;
    }
    
    return task;
  }

  private legacyMarkdownToTask(taskId: string, markdown: string): Task {
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
    const descriptionLines: string[] = [];

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