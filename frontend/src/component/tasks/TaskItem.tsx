import type { Task, TaskEnergy } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronRight, Edit2, Plus, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'

import {
  taskQueries,
  useCreateSubtask,
  useDeleteSubtask,
  useDeleteTask,
  useUpdateSubtask,
  useUpdateTask,
} from '../../lib/queries/tasks'
import './TaskItem.css'

interface TaskItemProps {
  task: Task
}

export function TaskItem({ task }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(task.title)

  const updateTask = useUpdateTask()
  const deleteTask = useDeleteTask()
  const { data: subtasks } = useQuery(taskQueries.subtasks(task.id))
  const createSubtask = useCreateSubtask()
  const updateSubtask = useUpdateSubtask()
  const deleteSubtask = useDeleteSubtask()

  const handleToggleDone = (e: React.MouseEvent) => {
    e.stopPropagation()
    updateTask.mutate({
      id: task.id,
      data: { status: task.status === 'done' ? 'active' : 'done' },
    })
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Supprimer cette tâche ?')) {
      deleteTask.mutate(task.id)
    }
  }

  const handleUpdateEnergy = (energy: TaskEnergy | null) => {
    updateTask.mutate({
      id: task.id,
      data: { energy },
    })
  }

  const handleUpdateTitle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editedTitle.trim()) return
    updateTask.mutate(
      {
        id: task.id,
        data: { title: editedTitle.trim() },
      },
      {
        onSuccess: () => setIsEditingTitle(false),
      }
    )
  }

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    createSubtask.mutate(
      { taskId: task.id, data: { title: newSubtaskTitle.trim() } },
      {
        onSuccess: () => setNewSubtaskTitle(''),
      }
    )
  }

  return (
    <div className={`task-item ${task.status === 'done' ? 'task-item--done' : ''}`}>
      <div className="task-item__main" onClick={() => setIsExpanded(!isExpanded)}>
        <button
          type="button"
          className={`task-item__checkbox ${task.status === 'done' ? 'task-item__checkbox--checked' : ''}`}
          onClick={handleToggleDone}
        >
          {task.status === 'done' && <Check size={14} />}
        </button>

        <div className="task-item__content">
          {isEditingTitle ? (
            <form onSubmit={handleUpdateTitle} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                className="task-item__title-input"
                autoFocus
              />
            </form>
          ) : (
            <span
              className="task-item__title"
              onDoubleClick={(e) => {
                e.stopPropagation()
                setIsEditingTitle(true)
              }}
            >
              {task.title}
            </span>
          )}

          <div className="task-item__badges">
            {task.energy ? (
              <button
                type="button"
                className={`task-item__energy task-item__energy--${task.energy}`}
                onClick={(e) => {
                  e.stopPropagation()
                  const energies: (TaskEnergy | null)[] = ['low', 'medium', 'high', null]
                  const next = energies[(energies.indexOf(task.energy) + 1) % energies.length]
                  handleUpdateEnergy(next)
                }}
              >
                <Zap size={12} />
                <span>{task.energy}</span>
              </button>
            ) : (
              <button
                type="button"
                className="task-item__energy-placeholder"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUpdateEnergy('low')
                }}
              >
                <Zap size={12} />
                <span>Énergie ?</span>
              </button>
            )}
          </div>
        </div>

        <div className="task-item__actions">
          <button
            type="button"
            className="task-item__action-btn"
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingTitle(true)
            }}
          >
            <Edit2 size={16} />
          </button>
          <button type="button" className="task-item__action-btn" onClick={handleDelete}>
            <Trash2 size={16} />
          </button>
          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </div>

      {isExpanded && (
        <div className="task-item__details">
          <div className="subtasks-list">
            {subtasks?.map((subtask) => (
              <div key={subtask.id} className="subtask-item">
                <button
                  type="button"
                  className={`subtask-item__checkbox ${subtask.completed ? 'subtask-item__checkbox--checked' : ''}`}
                  onClick={() =>
                    updateSubtask.mutate({
                      taskId: task.id,
                      subId: subtask.id,
                      data: { completed: !subtask.completed },
                    })
                  }
                >
                  {subtask.completed && <Check size={12} />}
                </button>
                <span
                  className={`subtask-item__title ${subtask.completed ? 'subtask-item__title--done' : ''}`}
                >
                  {subtask.title}
                </span>
                <button
                  type="button"
                  className="subtask-item__delete"
                  onClick={() => deleteSubtask.mutate({ taskId: task.id, subId: subtask.id })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <form className="subtask-add-form" onSubmit={handleAddSubtask}>
            <input
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Ajouter une sous-tâche..."
              className="subtask-add-input"
            />
            <button type="submit" disabled={createSubtask.isPending} className="subtask-add-btn">
              <Plus size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
