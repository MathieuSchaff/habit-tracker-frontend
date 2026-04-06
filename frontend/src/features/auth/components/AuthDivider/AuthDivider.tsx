export const AuthDivider = ({ text = 'ou' }: { text?: string }) => {
  return (
    <div className="auth-divider" aria-hidden="true">
      <span>{text}</span>
    </div>
  )
}
