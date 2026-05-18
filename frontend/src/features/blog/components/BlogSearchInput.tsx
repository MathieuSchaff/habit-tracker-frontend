import { Search } from 'lucide-react'

type Props = {
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function BlogSearchInput({ value, placeholder, onChange }: Props) {
  return (
    <div className="blog-search-wrap">
      <Search size={15} className="blog-search__icon" aria-hidden />
      <input
        type="search"
        className="blog-search__input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Rechercher"
      />
    </div>
  )
}
