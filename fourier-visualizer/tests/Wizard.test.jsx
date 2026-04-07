import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Wizard from '../src/components/Wizard'

const makeChapters = (n) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Chapter ${i + 1}`,
    component: ({ onComplete }) => (
      <button onClick={onComplete}>Complete Ch{i + 1}</button>
    ),
  }))

describe('Wizard', () => {
  it('renders the first chapter on mount', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.getByText('Complete Ch1')).toBeInTheDocument()
  })

  it('does not show Next button until chapter is completed', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.queryByRole('button', { name: /next/i })).toBeNull()
  })

  it('shows Next button after chapter completes', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
  })

  it('advances to next chapter when Next is clicked', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Complete Ch2')).toBeInTheDocument()
  })

  it('Prev button is disabled on first chapter', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
  })

  it('Prev button navigates back', () => {
    render(<Wizard chapters={makeChapters(3)} />)
    fireEvent.click(screen.getByText('Complete Ch1'))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /prev/i }))
    expect(screen.getByText('Complete Ch1')).toBeInTheDocument()
  })
})
