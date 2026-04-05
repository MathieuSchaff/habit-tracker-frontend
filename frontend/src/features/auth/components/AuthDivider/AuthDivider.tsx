export const AuthDivider = ({ text = 'ou' }: { text?: string }) => {
  return (
    <div className="auth-divider">
      <span>{text}</span>
    </div>
  )
}
