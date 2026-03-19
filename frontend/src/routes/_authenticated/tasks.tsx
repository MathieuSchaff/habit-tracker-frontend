import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '../../features/tasks/components/TasksPage/TasksPage'

export const Route = createFileRoute('/_authenticated/tasks')({
  component: TasksPage,
})
