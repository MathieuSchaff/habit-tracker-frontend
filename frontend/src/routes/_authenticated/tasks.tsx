import { createFileRoute } from '@tanstack/react-router'

import { TasksPage } from '../../features/tasks/page/TasksPage'

export const Route = createFileRoute('/_authenticated/tasks')({
  component: TasksPage,
})
