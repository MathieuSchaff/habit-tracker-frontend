import { Time } from '@/component/DataDisplay/Time/Time'
import { PageTitle } from '@/component/Typography/PageTitle/PageTitle'
import { ProfileAvatar } from '../ProfileAvatar/ProfileAvatar'
import './ProfileHero.css'

type ProfileHeroProps = {
  displayName: string
  avatarUrl: string | null | undefined
  username: string | null | undefined
  createdAt: string | null | undefined
  fitzpatrickType: number | null | undefined
}

export function ProfileHero({
  displayName,
  avatarUrl,
  username,
  createdAt,
  fitzpatrickType,
}: ProfileHeroProps) {
  return (
    <div className="profile-hero" data-fitz={fitzpatrickType ?? 0}>
      <div className="profile-hero__banner" aria-hidden="true">
        <div className="profile-hero__banner-glow" />
      </div>
      <div className="profile-hero__content">
        <div className="profile-hero__avatar-wrapper">
          <ProfileAvatar avatarUrl={avatarUrl} username={username} size="xl" />
        </div>

        <div className="profile-hero__main">
          <div className="profile-hero__header">
            <PageTitle title={displayName} className="profile-hero__info" />
          </div>

          {createdAt && (
            <p className="profile-hero__since">
              <span aria-hidden="true">·</span>
              <span>
                Membre depuis <Time iso={createdAt} style="monthYear" />
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
