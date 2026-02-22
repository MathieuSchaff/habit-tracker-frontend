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

  return (
    <div className={`profile-avatar profile-avatar--${size}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`Avatar de ${username ?? 'utilisateur'}`}
          className="profile-avatar__img"
        />
      ) : initials ? (
        <span className="profile-avatar__initials">{initials}</span>
      ) : (
        <User className="profile-avatar__icon" />
      )}
    </div>
  )
}
