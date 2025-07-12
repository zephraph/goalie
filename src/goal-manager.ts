import type { Goal, Task } from './types.ts';
import { FileUtils } from './file-utils.ts';

export class GoalManager {
  private fileUtils: FileUtils;

  constructor() {
    this.fileUtils = new FileUtils();
  }

  async init(): Promise<void> {
    await this.fileUtils.init();
  }

  async createGoal(name: string, description?: string, dueDateStr?: string): Promise<Goal> {
    const id = this.generateGoalId(name);
    const goal: Goal = {
      id,
      name,
      description: description || '',
      createdDate: new Date(),
      dueDate: dueDateStr ? new Date(dueDateStr) : undefined,
      status: 'active',
      tasks: [],
      completionPercentage: 0
    };

    await this.fileUtils.saveGoal(goal);
    return goal;
  }

  async breakdownGoal(goalId: string): Promise<void> {
    const goal = await this.fileUtils.loadGoal(goalId);
    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }

    console.log('Starting goal breakdown with Claude Code...');
    
    // Create a detailed prompt for Claude Code
    const prompt = this.createBreakdownPrompt(goal);
    
    // Call Claude Code CLI to break down the goal
    const claudeResponse = await this.callClaudeCode(prompt);
    
    // Parse the response and create tasks
    const tasks = this.parseTasksFromResponse(claudeResponse, goalId);
    
    // Save all tasks
    for (const task of tasks) {
      await this.fileUtils.saveTask(goalId, task);
      goal.tasks.push(task.id);
    }
    
    // Update goal with task references
    await this.fileUtils.saveGoal(goal);
    
    console.log(`Created ${tasks.length} tasks for goal "${goal.name}"`);
  }

  async listGoals(): Promise<Goal[]> {
    const goals = await this.fileUtils.listGoals();
    
    // Update completion percentages
    for (const goal of goals) {
      goal.completionPercentage = await this.calculateCompletionPercentage(goal.id);
    }
    
    return goals;
  }

  async calculateCompletionPercentage(goalId: string): Promise<number> {
    const tasks = await this.fileUtils.listTasksForGoal(goalId);
    if (tasks.length === 0) return 0;
    
    const completedTasks = tasks.filter(task => task.status === 'completed');
    return Math.round((completedTasks.length / tasks.length) * 100);
  }

  private generateGoalId(name: string): string {
    const timestamp = Date.now().toString(36);
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    return `${slug}-${timestamp}`;
  }

  private createBreakdownPrompt(goal: Goal): string {
    let prompt = `I need help breaking down this goal into actionable tasks:

Goal: ${goal.name}
Description: ${goal.description}`;

    if (goal.dueDate) {
      prompt += `\nDue Date: ${goal.dueDate.toISOString().split('T')[0]}`;
    }

    prompt += `

Please break this goal down into specific, actionable tasks. For each task, provide:
1. Title (clear and actionable)
2. Description (detailed enough to know exactly what to do)
3. Priority (high/medium/low)
4. Difficulty (1-10 scale)
5. Time estimate (in minutes)
6. Dependencies (if any, reference by task number)

Format your response as a JSON array of tasks with the following structure:
[
  {
    "title": "Task title",
    "description": "Detailed description",
    "priority": "high|medium|low",
    "difficulty": 1-10,
    "timeEstimate": minutes,
    "dependencies": ["1", "2"] // optional, task numbers this depends on
  }
]

Only return the JSON array, no additional text.`;

    return prompt;
  }

  private async callClaudeCode(prompt: string): Promise<string> {
    // For MVP, create a prompt file and ask user to use Claude Code manually
    const promptFile = `./claude-code-prompt-${Date.now()}.md`;
    
    const promptContent = `# Goal Breakdown Request

${prompt}

## Instructions
1. Copy the goal breakdown prompt above
2. Run: \`claude-code\` 
3. Paste the prompt and ask Claude to break down the goal
4. Copy the JSON response and paste it into a file named \`claude-response.json\` in this directory
5. Run the goalie command again to import the tasks

The expected JSON format is:
\`\`\`json
[
  {
    "title": "Task title",
    "description": "Detailed description", 
    "priority": "high|medium|low",
    "difficulty": 1-10,
    "timeEstimate": minutes,
    "dependencies": ["1", "2"]
  }
]
\`\`\`
`;

    await Deno.writeTextFile(promptFile, promptContent);
    
    console.log(`\nPrompt saved to: ${promptFile}`);
    console.log('Please follow the instructions in the file to get Claude Code to break down your goal.');
    console.log('After you have the response, you can import the tasks manually or we can add an import command later.');
    
    // Return a fallback response for now
    return JSON.stringify([
      {
        title: "Review goal and create detailed plan",
        description: "Break down this goal into specific, actionable tasks with priorities and time estimates",
        priority: "high", 
        difficulty: 3,
        timeEstimate: 60,
        dependencies: []
      },
      {
        title: "Execute first phase of goal",
        description: "Begin working on the initial tasks identified in the planning phase",
        priority: "medium",
        difficulty: 5, 
        timeEstimate: 120,
        dependencies: ["1"]
      }
    ]);
  }

  private parseTasksFromResponse(response: string, goalId: string): Task[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const tasksData = JSON.parse(jsonMatch[0]);
      const tasks: Task[] = [];

      tasksData.forEach((taskData: any, index: number) => {
        const taskId = (index + 1).toString();
        
        const task: Task = {
          id: taskId,
          title: taskData.title || `Task ${taskId}`,
          description: taskData.description || '',
          status: 'todo',
          priority: taskData.priority || 'medium',
          difficulty: taskData.difficulty || 1,
          timeEstimate: taskData.timeEstimate || 30,
          dependencies: this.resolveDependencies(taskData.dependencies || []),
          subtasks: []
        };

        tasks.push(task);
      });

      return tasks;
    } catch (error) {
      console.error('Failed to parse Claude Code response:', error);
      console.log('Raw response:', response);
      
      // Fallback: create a single task to review the goal manually
      return [{
        id: '1',
        title: 'Review and break down goal manually',
        description: `Claude Code integration failed. Please manually break down the goal: ${goalId}`,
        status: 'todo',
        priority: 'high',
        difficulty: 3,
        timeEstimate: 60,
        dependencies: [],
        subtasks: []
      }];
    }
  }

  private resolveDependencies(deps: (string | number)[]): string[] {
    return deps.map(dep => dep.toString());
  }
}