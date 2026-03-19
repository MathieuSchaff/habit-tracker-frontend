import type { ProfilePublic, ProfileUpdateInput } from '@habit-tracker/shared'

import { Check, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/component/Button/Button'
import { Input } from '@/component/Input/Input'
import { Textarea } from '@/component/Textarea/Textarea'
import './ProfileForm.css'

type ProfileFormProps = {
  profile: ProfilePublic
  onSubmit: (data: ProfileUpdateInput) => void
  onCancel: () => void
  isPending: boolean
  error?: string | null
}

export const ProfileForm = ({
  profile,
  onSubmit,
  onCancel,
  isPending,
  error,
}: ProfileFormProps) => {
  // Using simple local state here instead of a form library like RHF 
  // since we only have a few fields and basic validation.
  const [username, setUsername] = useState(profile.username ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: ProfileUpdateInput = {}

    if (username !== (profile.username ?? '')) data.username = username
    if (bio !== (profile.bio ?? '')) data.bio = bio
    if (avatarUrl !== (profile.avatarUrl ?? '')) data.avatarUrl = avatarUrl

    if (Object.keys(data).length === 0) {
      onCancel()
      return
    }

    onSubmit(data)
  }

  return (
    <div className="profile-form-card">
      <h3 className="profile-form-card__title">Modifier le profil</h3>

      <form className="profile-form" onSubmit={handleSubmit}>
        <Input
          label="Nom d'utilisateur"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="mon-pseudo"
          maxLength={32}
          hint="Entre 1 et 32 caractères"
          disabled={isPending}
        />

        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Quelques mots sur toi…"
          maxLength={500}
          hint={`${bio.length}/500`}
          rows={4}
          disabled={isPending}
        />

        <Input
          label="URL de l'avatar"
          type="url"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://exemple.com/avatar.jpg"
          disabled={isPending}
        />

        {error && (
          <p className="profile-form__error" role="alert">
            {error}
          </p>
        )}

        <div className="profile-form__actions">
          <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={isPending}>
            <X size={16} />
            Annuler
          </Button>
          <Button type="submit" variant="primary" size="md" loading={isPending}>
            <Check size={16} />
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  )
}
