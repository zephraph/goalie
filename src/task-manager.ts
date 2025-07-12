import { Task, Goal } from './types.ts';
import { FileUtils } from './file-utils.ts';

export class TaskManager {
  private fileUtils: FileUtils;

  constructor() {
    this.fileUtils = new FileUtils();
  }

  async getRecommendedTask(goalId?: string): Promise<Task | null> {
    let goals: Goal[] = [];
    
    if (goalId) {
      const goal = await this.fileUtils.loadGoal(goalId);
      if (goal) goals = [goal];
    } else {
      goals = await this.fileUtils.listGoals();
      goals = goals.filter(g => g.status === 'active');
    }

    if (goals.length === 0) {
      return null;
    }

    // Get all available tasks from active goals
    const allTasks: Task[] = [];
    for (const goal of goals) {
      const tasks = await this.fileUtils.listTasksForGoal(goal.id);
      allTasks.push(...tasks);
    }

    // Filter for tasks that can be worked on (no incomplete dependencies)
    const availableTasks = allTasks.filter(task => 
      task.status === 'todo' && this.canWorkOnTask(task, allTasks)
    );

    if (availableTasks.length === 0) {
      return null;
    }

    // Score tasks based on priority, difficulty, and time
    const scoredTasks = availableTasks.map(task => ({
      task,
      score: this.calculateTaskScore(task)
    }));

    // Sort by score (higher is better) and return the top task
    scoredTasks.sort((a, b) => b.score - a.score);
    return scoredTasks[0].task;
  }

  async completeTask(taskId: string): Promise<void> {
    // Find which goal this task belongs to
    const goals = await this.fileUtils.listGoals();
    
    for (const goal of goals) {
      const task = await this.fileUtils.loadTask(goal.id, taskId);
      if (task) {
        task.status = 'completed';
        task.completedDate = new Date();
        await this.fileUtils.saveTask(goal.id, task);
        return;
      }
    }
    
    throw new Error(`Task ${taskId} not found`);
  }

  async updateTaskStatus(goalId: string, taskId: string, status: Task['status']): Promise<void> {
    const task = await this.fileUtils.loadTask(goalId, taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in goal ${goalId}`);
    }
    
    task.status = status;
    if (status === 'completed') {
      task.completedDate = new Date();
    }
    
    await this.fileUtils.saveTask(goalId, task);
  }

  async getTasksForGoal(goalId: string): Promise<Task[]> {
    return await this.fileUtils.listTasksForGoal(goalId);
  }

  async getTask(goalId: string, taskId: string): Promise<Task | null> {
    return await this.fileUtils.loadTask(goalId, taskId);
  }

  async createSubtask(goalId: string, parentTaskId: string, subtaskData: Partial<Task>): Promise<Task> {
    const parentTask = await this.fileUtils.loadTask(goalId, parentTaskId);
    if (!parentTask) {
      throw new Error(`Parent task ${parentTaskId} not found`);
    }

    // Generate subtask ID (e.g., if parent is "1", first subtask is "1.1")
    const subtaskNumber = parentTask.subtasks.length + 1;
    const subtaskId = `${parentTaskId}.${subtaskNumber}`;

    const subtask: Task = {
      id: subtaskId,
      title: subtaskData.title || `Subtask ${subtaskNumber}`,
      description: subtaskData.description || '',
      status: 'todo',
      priority: subtaskData.priority || parentTask.priority,
      difficulty: subtaskData.difficulty || parentTask.difficulty,
      timeEstimate: subtaskData.timeEstimate || 30,
      dependencies: subtaskData.dependencies || [],
      parentTask: parentTaskId,
      subtasks: []
    };

    // Save subtask
    await this.fileUtils.saveTask(goalId, subtask);

    // Update parent task
    parentTask.subtasks.push(subtaskId);
    await this.fileUtils.saveTask(goalId, parentTask);

    return subtask;
  }

  async getAvailableTasks(goalId?: string): Promise<Task[]> {
    let goals: Goal[] = [];
    
    if (goalId) {
      const goal = await this.fileUtils.loadGoal(goalId);
      if (goal) goals = [goal];
    } else {
      goals = await this.fileUtils.listGoals();
      goals = goals.filter(g => g.status === 'active');
    }

    const allTasks: Task[] = [];
    for (const goal of goals) {
      const tasks = await this.fileUtils.listTasksForGoal(goal.id);
      allTasks.push(...tasks);
    }

    return allTasks.filter(task => 
      task.status === 'todo' && this.canWorkOnTask(task, allTasks)
    );
  }

  private canWorkOnTask(task: Task, allTasks: Task[]): boolean {
    if (task.dependencies.length === 0) {
      return true;
    }

    // Check if all dependencies are completed
    return task.dependencies.every(depId => {
      const depTask = allTasks.find(t => t.id === depId);
      return depTask && depTask.status === 'completed';
    });
  }

  private calculateTaskScore(task: Task): number {
    let score = 0;

    // Priority scoring (high = 3, medium = 2, low = 1)
    const priorityScore = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
    score += priorityScore * 10;

    // Difficulty scoring (easier tasks get higher score for quick wins)
    const difficultyScore = 11 - task.difficulty; // Invert so easier = higher score
    score += difficultyScore * 2;

    // Time estimate scoring (shorter tasks get higher score)
    const timeScore = Math.max(1, 120 - task.timeEstimate); // Prefer tasks under 2 hours
    score += timeScore / 10;

    // Due date urgency (if task has a due date)
    if (task.dueDate) {
      const daysUntilDue = Math.ceil((task.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 1) score += 20; // Very urgent
      else if (daysUntilDue <= 3) score += 10; // Urgent
      else if (daysUntilDue <= 7) score += 5; // Somewhat urgent
    }

    return score;
  }
}