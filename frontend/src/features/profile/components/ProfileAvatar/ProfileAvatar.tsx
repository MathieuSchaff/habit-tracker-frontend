import { User } from 'lucide-react'
import './ProfileAvatar.css'

type ProfileAvatarProps = {
  avatarUrl?: string | null
  username?: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const getInitials = (username?: string | null): string | null => {
  if (username) return username[0].toUpperCase()
  return null
}

export const ProfileAvatar = ({ avatarUrl, username, size = 'lg' }: ProfileAvatarProps) => {
  const initials = getInitials(username)

  const label = `Avatar de ${username ?? 'utilisateur'}`

  return (
    <div className={`profile-avatar profile-avatar--${size}`} role="img" aria-label={label}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={label} className="profile-avatar__img" />
      ) : initials ? (
        <span className="profile-avatar__initials" aria-hidden="true">
          {initials}
        </span>
      ) : (
        <User className="profile-avatar__icon" aria-hidden="true" />
      )}
    </div>
  )
}
