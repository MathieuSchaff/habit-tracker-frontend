import type { ProfileLink, ProfilePublic, ProfileUpdateInput } from '@habit-tracker/shared'

import { useState } from 'react'

import { FormMessage } from '@/component/Feedback/FormMessage/FormMessage'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'
import { Textarea } from '@/component/Textarea/Textarea'
import { ProfileLinksEditor } from '../ProfileLinksEditor/ProfileLinksEditor'
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
  const [username, setUsername] = useState(profile.username ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '')
  const [links, setLinks] = useState<ProfileLink[]>(profile.links ?? [])
  const [avatarError, setAvatarError] = useState(false)

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()

    const data: ProfileUpdateInput = {}

    if (username !== (profile.username ?? '')) data.username = username
    if (bio !== (profile.bio ?? '')) data.bio = bio
    if (avatarUrl !== (profile.avatarUrl ?? '')) data.avatarUrl = avatarUrl
    if (JSON.stringify(links) !== JSON.stringify(profile.links ?? [])) data.links = links

    if (Object.keys(data).length === 0) {
      onCancel()
      return
    }

    onSubmit(data)
  }

  return (
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
        placeholder="Quelques mots sur vous…"
        maxLength={500}
        hint={`${bio.length}/500`}
        rows={4}
        disabled={isPending}
      />

      <div className="profile-form__avatar-group">
        <Input
          label="URL de l'avatar"
          type="url"
          value={avatarUrl}
          onChange={(e) => {
            setAvatarUrl(e.target.value)
            setAvatarError(false)
          }}
          placeholder="https://exemple.com/avatar.jpg"
          disabled={isPending}
          className="profile-form__avatar-input"
          error={avatarError ? 'Image introuvable à cette URL' : undefined}
        />
        {avatarUrl && !avatarError && (
          <div className="profile-form__avatar-preview">
            <img src={avatarUrl} alt="Aperçu" onError={() => setAvatarError(true)} />
          </div>
        )}
      </div>

      <div className="profile-form__links-group">
        <span className="profile-form__links-label">Liens (max 5)</span>
        <ProfileLinksEditor links={links} onChange={setLinks} disabled={isPending} />
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <FormActions onCancel={onCancel} isPending={isPending} />
    </form>
  )
}
