import type { Task, TaskEnergy } from '@habit-tracker/shared'

import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Edit2, Plus, Trash2, Zap } from 'lucide-react'
import { useState } from 'react'

import { Checkbox } from '@/component/Input/Checkbox/Checkbox'
import {
  taskQueries,
  useCreateSubtask,
  useDeleteSubtask,
  useDeleteTask,
  useUpdateSubtask,
  useUpdateTask,
} from '../../../lib/queries/tasks'
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

  const handleUpdateTitle = (e: React.SubmitEvent) => {
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

  const handleAddSubtask = (e: React.SubmitEvent) => {
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
      {/* biome-ignore lint/a11y/useSemanticElements: cannot be a button because it contains other buttons */}
      <div
        className="task-item__main"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={`task-details-${task.id}`}
        aria-label={`${isExpanded ? 'Réduire' : 'Développer'} les détails de "${task.title}"`}
      >
        {/* biome-ignore lint/a11y/noStaticElementInteractions: stops click from toggling expand on parent button */}
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.status === 'done'}
            onChange={() =>
              updateTask.mutate({
                id: task.id,
                data: { status: task.status === 'done' ? 'active' : 'done' },
              })
            }
            label={`Marquer "${task.title}" comme ${task.status === 'done' ? 'à faire' : 'terminée'}`}
          />
        </span>

        <div className="task-item__content">
          {isEditingTitle ? (
            <form
              onSubmit={handleUpdateTitle}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label htmlFor={`edit-task-${task.id}`} className="sr-only">
                Titre de la tâche
              </label>
              <input
                id={`edit-task-${task.id}`}
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                className="task-item__title-input"
              />
            </form>
          ) : (
            <span className="task-item__title">{task.title}</span>
          )}

          <div className="task-item__badges">
            {task.energy ? (
              <button
                type="button"
                className={`task-item__energy task-item__energy--${task.energy}`}
                aria-label={`Énergie : ${task.energy}. Cliquer pour changer`}
                onClick={(e) => {
                  e.stopPropagation()
                  // We cycle the energy levels: low, medium, high and then back to none.
                  const energies: (TaskEnergy | null)[] = ['low', 'medium', 'high', null]
                  const next = energies[(energies.indexOf(task.energy) + 1) % energies.length]
                  handleUpdateEnergy(next)
                }}
              >
                <Zap size={12} aria-hidden="true" />
                <span>{task.energy}</span>
              </button>
            ) : (
              <button
                type="button"
                className="task-item__energy-placeholder"
                aria-label="Définir l'énergie"
                onClick={(e) => {
                  e.stopPropagation()
                  handleUpdateEnergy('low')
                }}
              >
                <Zap size={12} aria-hidden="true" />
                <span>Énergie ?</span>
              </button>
            )}
          </div>
        </div>

        <div className="task-item__actions">
          <button
            type="button"
            className="task-item__action-btn"
            aria-label={`Modifier "${task.title}"`}
            onClick={(e) => {
              e.stopPropagation()
              setIsEditingTitle(true)
            }}
          >
            <Edit2 size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="task-item__action-btn"
            aria-label={`Supprimer "${task.title}"`}
            onClick={handleDelete}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
          {isExpanded ? (
            <ChevronDown size={20} aria-hidden="true" />
          ) : (
            <ChevronRight size={20} aria-hidden="true" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div id={`task-details-${task.id}`} className="task-item__details">
          <div className="subtasks-list">
            {subtasks?.map((subtask) => (
              <div key={subtask.id} className="subtask-item">
                <Checkbox
                  checked={subtask.completed}
                  onChange={(checked) =>
                    updateSubtask.mutate({
                      taskId: task.id,
                      subId: subtask.id,
                      data: { completed: checked },
                    })
                  }
                  size="sm"
                  label={`Marquer "${subtask.title}" comme ${subtask.completed ? 'à faire' : 'terminée'}`}
                />
                <span
                  className={`subtask-item__title ${subtask.completed ? 'subtask-item__title--done' : ''}`}
                >
                  {subtask.title}
                </span>
                <button
                  type="button"
                  className="subtask-item__delete"
                  aria-label={`Supprimer "${subtask.title}"`}
                  onClick={() => deleteSubtask.mutate({ taskId: task.id, subId: subtask.id })}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>

          <form className="subtask-add-form" onSubmit={handleAddSubtask}>
            <label htmlFor={`new-subtask-${task.id}`} className="sr-only">
              Ajouter une sous-tâche
            </label>
            <input
              id={`new-subtask-${task.id}`}
              name="subtask-title"
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Ajouter une sous-tâche..."
              className="subtask-add-input"
            />
            <button
              type="submit"
              disabled={createSubtask.isPending}
              className="subtask-add-btn"
              aria-label="Ajouter la sous-tâche"
            >
              <Plus size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
