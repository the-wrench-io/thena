import React from 'react';

import { Box, Divider, Button } from '@mui/material';
import TaskOps from '../TaskOps';
import TestTask from './test_task_1.json';
import DatePicker from '../DatePicker';
import Checklist from '../Checklist';

const Dev: React.FC = () => {

  const [open, setOpen] = React.useState(false);

  return (
    <Box sx={{ width: '100%', p: 1 }}>
      <Box>COMPONENT 1 create task preview</Box>
      <TaskOps.CreateTaskView />
      <Divider />

      <Divider />
      <Box>Edit task dialog</Box>
      <Button variant='contained' onClick={() => setOpen(true)}>Open dialog</Button>
      <TaskOps.EditTaskDialog onClose={() => setOpen(false)} open={open} task={TestTask as any} />

      <Divider sx={{ my: 2 }} />
      <DatePicker />

      <Divider sx={{ my: 2 }} />
      <Checklist />

    </Box>);
}

export { Dev };
