import type { ProfileLink, ProfilePublic, ProfileUpdateInput } from '@habit-tracker/shared'
import { BIO_MAX_LENGTH, USERNAME_MAX_LENGTH } from '@habit-tracker/shared'

import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { FormMessage } from '@/component/Feedback/ui/FormMessage/FormMessage'
import { ImageUpload } from '@/component/ImageUpload'
import { FormActions } from '@/component/Input/FormActions/FormActions'
import { Input } from '@/component/Input/Input'
import { Textarea } from '@/component/Input/Textarea/Textarea'
import { type ProfileLinkError, ProfileLinksEditor } from '../ProfileLinksEditor/ProfileLinksEditor'
import './ProfileForm.css'

const HTTP_URL_RE = /^https?:\/\//
function isHttpUrl(value: string): boolean {
  if (!HTTP_URL_RE.test(value)) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validateLinkRow(label: string, url: string): ProfileLinkError | null {
  if (label === '' && url === '') return null
  const e: ProfileLinkError = {}
  if (label === '') e.label = 'Donnez un nom à ce lien'
  if (url === '') e.url = 'Ajoutez une adresse'
  else if (!isHttpUrl(url)) e.url = "L'adresse n'a pas l'air valide"
  return Object.keys(e).length === 0 ? null : e
}

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
  const queryClient = useQueryClient()
  const [username, setUsername] = useState(profile.username ?? '')
  const [bio, setBio] = useState(profile.bio ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? null)
  const [links, setLinks] = useState<ProfileLink[]>(profile.links ?? [])
  const [linkErrors, setLinkErrors] = useState<ReadonlyArray<ProfileLinkError | null>>([])

  const handleLinksChange = (next: ProfileLink[]) => {
    setLinks(next)
    if (linkErrors.length > 0) setLinkErrors([])
  }

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault()

    const trimmedLinks = links.map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    const rowErrors = trimmedLinks.map((l) => validateLinkRow(l.label, l.url))

    if (rowErrors.some((err) => err !== null)) {
      setLinkErrors(rowErrors)
      return
    }

    // Fully-empty rows are dropped before diffing — keep the editor calm.
    const cleanLinks = trimmedLinks.filter((l) => l.label !== '' || l.url !== '')

    const data: ProfileUpdateInput = {}

    if (username !== (profile.username ?? '')) data.username = username
    if (bio !== (profile.bio ?? '')) data.bio = bio
    if (JSON.stringify(cleanLinks) !== JSON.stringify(profile.links ?? [])) data.links = cleanLinks

    if (Object.keys(data).length === 0) {
      onCancel()
      return
    }

    onSubmit(data)
  }

  return (
    <form className="profile-form" onSubmit={handleSubmit} noValidate>
      <Input
        label="Nom d'utilisateur"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="mon-pseudo"
        maxLength={USERNAME_MAX_LENGTH}
        hint={`Entre 1 et ${USERNAME_MAX_LENGTH} caractères`}
        disabled={isPending}
      />

      <Textarea
        label="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Quelques mots sur vous…"
        maxLength={BIO_MAX_LENGTH}
        hint={`${bio.length}/${BIO_MAX_LENGTH}`}
        rows={4}
        disabled={isPending}
      />

      <div className="profile-form__avatar-group">
        <span className="profile-form__avatar-label">Avatar</span>
        <ImageUpload
          shape="round"
          outputSize={1024}
          endpoint="/api/uploads/avatar"
          currentImageUrl={avatarUrl}
          alt={`Avatar de ${profile.username ?? 'utilisateur'}`}
          onSuccess={(url) => {
            setAvatarUrl(url)
            queryClient.invalidateQueries({ queryKey: ['profile', 'me'] })
          }}
        />
      </div>

      <div className="profile-form__links-group">
        <span className="profile-form__links-label">Liens (max 5)</span>
        <ProfileLinksEditor
          links={links}
          onChange={handleLinksChange}
          disabled={isPending}
          errors={linkErrors}
        />
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <FormActions onCancel={onCancel} isPending={isPending} />
    </form>
  )
}
