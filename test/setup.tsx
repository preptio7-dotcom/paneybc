import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

vi.mock('next/image', () => ({
  default: (props: any) => {
    return <img {...props} alt={props.alt || ''} />
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === 'string' ? href : '#'} {...props}>
      {children}
    </a>
  ),
}))

