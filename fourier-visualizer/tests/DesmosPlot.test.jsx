import { render } from '@testing-library/react'
import DesmosPlot from '../src/components/shared/DesmosPlot'

const mockSetExpression = vi.fn()
const mockSetMathBounds = vi.fn()
const mockDestroy = vi.fn()
const mockCalc = {
  setExpression: mockSetExpression,
  setMathBounds: mockSetMathBounds,
  destroy: mockDestroy,
}

beforeEach(() => {
  vi.clearAllMocks()
  window.Desmos = { GraphingCalculator: vi.fn(() => mockCalc) }
})

afterEach(() => {
  delete window.Desmos
})

test('creates calculator on mount with chrome disabled', () => {
  render(
    <DesmosPlot
      lines={[{ latex: 'y=\\sin(x)', color: '#60a5fa' }]}
      variables={{ f: 220 }}
      xDomain={[0, 0.02]}
      yDomain={[-1.5, 1.5]}
    />
  )
  expect(window.Desmos.GraphingCalculator).toHaveBeenCalledWith(
    expect.any(HTMLElement),
    expect.objectContaining({
      keypad: false,
      expressions: false,
      settingsMenu: false,
      zoomButtons: false,
      lockViewport: true,
    })
  )
})

test('sets math bounds from xDomain and yDomain', () => {
  render(
    <DesmosPlot
      lines={[]}
      variables={{}}
      xDomain={[0, 0.02]}
      yDomain={[-1.5, 1.5]}
    />
  )
  expect(mockSetMathBounds).toHaveBeenCalledWith({
    left: 0,
    right: 0.02,
    bottom: -1.5,
    top: 1.5,
  })
})

test('sets each line expression on mount', () => {
  render(
    <DesmosPlot
      lines={[
        { latex: 'y=\\sin(x)', color: '#60a5fa' },
        { latex: 'y=\\cos(x)', color: '#34d399' },
      ]}
      variables={{}}
      xDomain={[0, 1]}
      yDomain={[-1, 1]}
    />
  )
  expect(mockSetExpression).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'line_0', latex: 'y=\\sin(x)', color: '#60a5fa' })
  )
  expect(mockSetExpression).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'line_1', latex: 'y=\\cos(x)', color: '#34d399' })
  )
})

test('sets variable expressions on render', () => {
  render(
    <DesmosPlot
      lines={[]}
      variables={{ f: 440, A: 0.8 }}
      xDomain={[0, 1]}
      yDomain={[-1, 1]}
    />
  )
  expect(mockSetExpression).toHaveBeenCalledWith({ id: 'var_f', latex: 'f=440' })
  expect(mockSetExpression).toHaveBeenCalledWith({ id: 'var_A', latex: 'A=0.8' })
})

test('destroys calculator on unmount', () => {
  const { unmount } = render(
    <DesmosPlot lines={[]} variables={{}} xDomain={[0, 1]} yDomain={[-1, 1]} />
  )
  unmount()
  expect(mockDestroy).toHaveBeenCalled()
})

test('does not crash when Desmos is not loaded', () => {
  delete window.Desmos
  expect(() =>
    render(<DesmosPlot lines={[]} variables={{}} xDomain={[0, 1]} yDomain={[-1, 1]} />)
  ).not.toThrow()
})
