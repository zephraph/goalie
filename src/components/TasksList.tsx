import type React from 'react';
import { Box, Text } from 'ink';
import type { Task } from '../types.ts';

interface TasksListProps {
  tasks: Task[];
  selectedIndex: number;
}

export const TasksList: React.FC<TasksListProps> = ({ tasks, selectedIndex }) => {
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'yellow';
      default: return 'white';
    }
  };

  const getPrioritySymbol = (priority: Task['priority']) => {
    switch (priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold color="blue">Tasks:</Text>
      {tasks.map((task, index) => (
        <Box key={task.id} paddingLeft={2}>
          <Text color={index === selectedIndex ? 'green' : getStatusColor(task.status)}>
            {index === selectedIndex ? '> ' : '  '}
            {getPrioritySymbol(task.priority)} {task.title} 
            <Text dimColor> ({task.status}) - {task.timeEstimate}min</Text>
          </Text>
        </Box>
      ))}
    </Box>
  );
};