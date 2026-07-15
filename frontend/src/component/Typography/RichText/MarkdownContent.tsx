import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Lazy chunk for GFM markdown (react-markdown + remark-gfm). Import via React.lazy;
// render inside <RichText> within a Suspense boundary.
export default function MarkdownContent({ children }: { children: string }) {
  // Authored content must not compete with the page h1.
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={{ h1: 'h2' }}>
      {children}
    </Markdown>
  )
}
