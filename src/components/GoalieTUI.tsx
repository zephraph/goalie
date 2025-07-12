import type React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { GoalsList } from './GoalsList.tsx';
import { TasksList } from './TasksList.tsx';
import type { Goal, Task } from '../types.ts';
import { GoalManager } from '../goal-manager.ts';
import { TaskManager } from '../task-manager.ts';

type View = 'goals' | 'tasks';

export const GoalieTUI: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedGoalIndex, setSelectedGoalIndex] = useState(0);
  const [selectedTaskIndex, setSelectedTaskIndex] = useState(0);
  const [currentView, setCurrentView] = useState<View>('goals');
  const [loading, setLoading] = useState(true);

  const goalManager = new GoalManager();
  const taskManager = new TaskManager();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const loadedGoals = await goalManager.listGoals();
      setGoals(loadedGoals);
      
      if (loadedGoals.length > 0) {
        const goalTasks = await taskManager.getTasksForGoal(loadedGoals[selectedGoalIndex]?.id);
        setTasks(goalTasks);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasksForCurrentGoal = async () => {
    if (goals[selectedGoalIndex]) {
      const goalTasks = await taskManager.getTasksForGoal(goals[selectedGoalIndex].id);
      setTasks(goalTasks);
      setSelectedTaskIndex(0);
    }
  };

  useInput((input, key) => {
    if (loading) return;

    if (key.escape) {
      Deno.exit(0);
    }

    if (key.tab) {
      setCurrentView(currentView === 'goals' ? 'tasks' : 'goals');
      return;
    }

    if (currentView === 'goals') {
      if (key.upArrow && selectedGoalIndex > 0) {
        const newIndex = selectedGoalIndex - 1;
        setSelectedGoalIndex(newIndex);
        loadTasksForCurrentGoal();
      }
      if (key.downArrow && selectedGoalIndex < goals.length - 1) {
        const newIndex = selectedGoalIndex + 1;
        setSelectedGoalIndex(newIndex);
        loadTasksForCurrentGoal();
      }
      if (key.return) {
        setCurrentView('tasks');
      }
    } else if (currentView === 'tasks') {
      if (key.upArrow && selectedTaskIndex > 0) {
        setSelectedTaskIndex(selectedTaskIndex - 1);
      }
      if (key.downArrow && selectedTaskIndex < tasks.length - 1) {
        setSelectedTaskIndex(selectedTaskIndex + 1);
      }
      if (key.return && tasks[selectedTaskIndex]) {
        // Toggle task status
        const task = tasks[selectedTaskIndex];
        const newStatus = task.status === 'todo' ? 'in_progress' : 
                         task.status === 'in_progress' ? 'completed' : 'todo';
        
        taskManager.updateTaskStatus(goals[selectedGoalIndex].id, task.id, newStatus)
          .then(() => loadData());
      }
    }
  });

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Goalie - Goal & Task Manager</Text>
      </Box>
      
      <Box flexDirection="row" gap={4}>
        <Box flexDirection="column" width="50%">
          <GoalsList goals={goals} selectedIndex={selectedGoalIndex} />
        </Box>
        
        <Box flexDirection="column" width="50%">
          <TasksList tasks={tasks} selectedIndex={selectedTaskIndex} />
        </Box>
      </Box>
      
      <Box marginTop={1} flexDirection="column">
        <Text dimColor>
          Current view: <Text color={currentView === 'goals' ? 'green' : 'white'}>Goals</Text> | 
          <Text color={currentView === 'tasks' ? 'green' : 'white'}> Tasks</Text>
        </Text>
        <Text dimColor>Controls: ↑↓ Navigate | Tab Switch View | Enter Select/Toggle | Esc Quit</Text>
      </Box>
    </Box>
  );
};