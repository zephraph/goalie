#!/usr/bin/env -S deno run --allow-all

import { Command } from 'commander';
import { GoalManager } from './goal-manager.ts';
import { TaskManager } from './task-manager.ts';
import { render } from 'ink';
import React from 'react';
import { GoalieTUI } from './components/GoalieTUI.tsx';

const program = new Command();
const goalManager = new GoalManager();
const taskManager = new TaskManager();

program
  .name('goalie')
  .description('A TUI/CLI app to help accomplish goals')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize goalie in the current directory')
  .action(async () => {
    await goalManager.init();
    console.log('Goalie initialized successfully!');
  });

program
  .command('create-goal')
  .description('Create a new goal and break it down into tasks')
  .argument('<name>', 'Goal name')
  .option('-d, --description <description>', 'Goal description')
  .option('-due, --due-date <date>', 'Due date (YYYY-MM-DD)')
  .action(async (name: string, options: { description?: string; dueDate?: string }) => {
    const goal = await goalManager.createGoal(name, options.description, options.dueDate);
    console.log(`Goal "${goal.name}" created with ID: ${goal.id}`);
    
    console.log('Breaking down goal into tasks...');
    await goalManager.breakdownGoal(goal.id);
  });

program
  .command('list-goals')
  .description('List all goals with completion status')
  .action(async () => {
    const goals = await goalManager.listGoals();
    console.log('\nGoals:');
    goals.forEach(goal => {
      console.log(`${goal.name} (${goal.completionPercentage}% complete) - ${goal.status}`);
    });
  });

program
  .command('work')
  .description('Get the recommended task to work on')
  .option('-g, --goal <goalId>', 'Specific goal ID to work on')
  .action(async (options: { goal?: string }) => {
    const task = await taskManager.getRecommendedTask(options.goal);
    if (task) {
      console.log(`Recommended task: ${task.title}`);
      console.log(`Description: ${task.description}`);
      console.log(`Priority: ${task.priority}, Difficulty: ${task.difficulty}/10`);
      console.log(`Estimated time: ${task.timeEstimate} minutes`);
    } else {
      console.log('No tasks available to work on.');
    }
  });

program
  .command('complete-task')
  .description('Mark a task as completed')
  .argument('<taskId>', 'Task ID to complete')
  .action(async (taskId: string) => {
    await taskManager.completeTask(taskId);
    console.log(`Task ${taskId} marked as completed.`);
  });

program
  .command('status')
  .description('Show overall status and progress')
  .action(async () => {
    const goals = await goalManager.listGoals();
    const totalGoals = goals.length;
    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const activeGoals = goals.filter(g => g.status === 'active').length;
    
    console.log('\n=== Goalie Status ===');
    console.log(`Total Goals: ${totalGoals}`);
    console.log(`Active Goals: ${activeGoals}`);
    console.log(`Completed Goals: ${completedGoals}`);
    
    if (activeGoals > 0) {
      console.log('\nActive Goals Progress:');
      const activeGoalsList = goals.filter(g => g.status === 'active');
      for (const goal of activeGoalsList) {
        console.log(`  ${goal.name}: ${goal.completionPercentage}% complete`);
      }
      
      const recommendedTask = await taskManager.getRecommendedTask();
      if (recommendedTask) {
        console.log(`\nRecommended next task: "${recommendedTask.title}"`);
        console.log(`Priority: ${recommendedTask.priority}, Time: ${recommendedTask.timeEstimate} min`);
      }
    }
  });

program
  .command('list-tasks')
  .description('List tasks for a goal')
  .argument('<goalId>', 'Goal ID')
  .action(async (goalId: string) => {
    const tasks = await taskManager.getTasksForGoal(goalId);
    console.log(`\nTasks for goal ${goalId}:`);
    tasks.forEach(task => {
      console.log(`${task.id}: ${task.title} (${task.status}) - ${task.priority} priority`);
    });
  });

program
  .command('tui')
  .description('Launch the interactive TUI interface')
  .action(() => {
    try {
      render(React.createElement(GoalieTUI));
    } catch (error) {
      console.error('TUI interface not supported in this environment.');
      console.log('Please use the CLI commands instead.');
      console.log('Run "goalie --help" to see available commands.');
    }
  });

if (import.meta.main) {
  program.parse();
}