import { useEffect } from 'react'

export default function Ch0_Intro({ onComplete }) {
  useEffect(() => { onComplete() }, [onComplete])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-gray-300">
        Welcome! In this website, we will give you a high-level overview of signal processing.
        We will cover ideas such as Fourier Series, Fourier Transform, and sampling!
      </p>
      <p className="text-gray-300">
        Some concepts may be difficult to grasp at first, but no worries.
        In the case where something is unintuitive, I have attached additional resources for better understanding.
      </p>
      <p className="text-gray-300">
        With that, let's jump right in!
      </p>
    </div>
  )
}
