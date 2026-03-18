import { createFileRoute } from '@tanstack/react-router'
import { TasksPage } from '../../component/pages/tasks/TasksPage'

export const Route = createFileRoute('/_authenticated/tasks')({
  component: TasksPage,
})
