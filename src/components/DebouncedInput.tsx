import { useState, useEffect, useRef } from 'react'

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string | number
  onChangeValue: (value: string) => void
  debounceTime?: number
  onClick?: () => void
}

export function DebouncedInput({ 
  value, 
  onChangeValue, 
  debounceTime = 500,
  onClick,
  ...props 
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isFocused, setIsFocused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Sync local value with prop value only when NOT focused to avoid fighting
    if (!isFocused) {
        setLocalValue(value)
    }
  }, [value, isFocused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newVal = e.target.value
    setLocalValue(newVal)

    if (timerRef.current) {
        clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
        onChangeValue(newVal)
    }, debounceTime)
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(true)
    // Select all text on focus for easy editing
    e.target.select()
    props.onFocus?.(e)
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setIsFocused(false)
    props.onBlur?.(e)
  }

  return (
    <input
      {...props}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={onClick}
    />
  )
}
