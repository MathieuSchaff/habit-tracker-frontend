import type { TaskErrorCode } from '@aurore/shared'

export class TaskError extends Error {
  constructor(
    public code: TaskErrorCode,
    public details?: unknown
  ) {
    super(code)
    this.name = 'TaskError'
  }
}
