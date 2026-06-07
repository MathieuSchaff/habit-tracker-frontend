import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Lazy chunk for GFM markdown (react-markdown + remark-gfm). Import via React.lazy;
// render inside <RichText> within a Suspense boundary.
export default function MarkdownContent({ children }: { children: string }) {
  return <Markdown remarkPlugins={[remarkGfm]}>{children}</Markdown>
}
