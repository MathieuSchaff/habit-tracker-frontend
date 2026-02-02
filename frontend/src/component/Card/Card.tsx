type CardType = {
  // separatedHeader: boolean;
} & React.ComponentProps<'div'>
export const Card = ({ children }: CardType) => {
  return <div>{children}</div>
}
