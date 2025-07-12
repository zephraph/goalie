import type React from 'react';
import { Box, Text } from 'ink';
import type { Goal } from '../types.ts';

interface GoalsListProps {
  goals: Goal[];
  selectedIndex: number;
}

export const GoalsList: React.FC<GoalsListProps> = ({ goals, selectedIndex }) => {
  return (
    <Box flexDirection="column">
      <Text bold color="blue">Goals:</Text>
      {goals.map((goal, index) => (
        <Box key={goal.id} paddingLeft={2}>
          <Text color={index === selectedIndex ? 'green' : 'white'}>
            {index === selectedIndex ? '> ' : '  '}
            {goal.name} ({goal.completionPercentage}% complete) - {goal.status}
          </Text>
        </Box>
      ))}
    </Box>
  );
};