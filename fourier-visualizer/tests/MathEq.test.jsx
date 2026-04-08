import { render } from '@testing-library/react'
import MathEq from '../src/components/shared/MathEq'

test('renders inline math with katex class', () => {
  const { container } = render(<MathEq math="f = 440" />)
  expect(container.querySelector('.katex')).not.toBeNull()
})

test('inline math renders as span', () => {
  const { container } = render(<MathEq math="A" />)
  expect(container.firstChild.tagName).toBe('SPAN')
})

test('block math renders with katex-display class', () => {
  const { container } = render(<MathEq math="X(\\omega) = \\int x(t) e^{-i\\omega t} dt" block />)
  expect(container.querySelector('.katex-display')).not.toBeNull()
})

test('block math renders as div', () => {
  const { container } = render(<MathEq math="f = 440" block />)
  expect(container.firstChild.tagName).toBe('DIV')
})

test('does not throw on invalid LaTeX', () => {
  expect(() => render(<MathEq math="\\invalid{" />)).not.toThrow()
})
