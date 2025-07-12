export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  difficulty: number; // 1-10 scale
  timeEstimate: number; // in minutes
  dependencies: string[]; // task IDs
  dueDate?: Date;
  recommendedStartDate?: Date;
  completedDate?: Date;
  parentTask?: string; // for subtasks
  subtasks: string[]; // subtask IDs
}

export interface Goal {
  id: string;
  name: string;
  description: string;
  createdDate: Date;
  dueDate?: Date;
  status: 'active' | 'completed' | 'paused';
  tasks: string[]; // task IDs
  completionPercentage: number;
}

export interface GoalieConfig {
  goalsDirectory: string;
  claudeCodePath?: string;
}