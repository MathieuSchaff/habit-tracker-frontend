import { format, getDay, subDays } from 'date-fns'

import type { Database } from '../../db/index'
import { checkHabit } from '../habits/habit-checks'
import { createHabit } from '../habits/habit-crud'

export async function seedDemoData(userId: string, db: Database) {
  console.log(`🌱 Seeding demo data for user ${userId}...`)

  // 1. Define habits
  const habitsToCreate = [
    {
      name: 'Méditation',
      category: 'Bien-être',
      frequency: { type: 'daily' as const },
      timings: [{ time: '08:00', label: 'Matin' }],
    },
    {
      name: 'Sport',
      category: 'Santé',
      frequency: {
        type: 'weekly' as const,
        daysOfWeek: [0, 2, 4],
      },
      timings: [{ time: '18:30', label: 'Soir' }],
    },
    {
      name: 'Lecture',
      category: 'Personnel',
      frequency: { type: 'daily' as const },
      timings: [{ time: '22:00', label: 'Coucher' }],
    },
  ]

  for (const habitInput of habitsToCreate) {
    const habit = await createHabit(habitInput, userId, db)

    // 2. Seed checks for the last 7 days (including today)
    for (let i = 0; i < 7; i++) {
      const date = subDays(new Date(), i)
      const dateStr = format(date, 'yyyy-MM-dd')

      // Determine if it should be checked (80% chance for realism)
      const shouldCheck = Math.random() < 0.8

      if (shouldCheck) {
        // For weekly habits, check if the day matches
        if (habitInput.frequency.type === 'weekly') {
          const dayOfWeek = getDay(date) // 0=Sun, 1=Mon...
          // Map JS getDay (0=Sun) to your schema (0=Mon, 6=Sun)
          const mappedDay = (dayOfWeek + 6) % 7
          if (!habitInput.frequency.daysOfWeek.includes(mappedDay)) {
            continue
          }
        }

        try {
          await checkHabit(
            {
              userId,
              habitId: habit.id,
              date: dateStr,
              // We can add timingId if needed, but checkHabit handles it
            },
            db
          )
        } catch (e) {
          console.error(`Failed to seed check for habit ${habit.name} on ${dateStr}`, e)
        }
      }
    }
  }
  console.log(`✅ Demo data seeded successfully for user ${userId}`)
}
