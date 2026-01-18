import { useEffect, useRef, useState } from 'react'

type WeightInputModalProps = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (weight: number) => void
  productName: string
}

export function WeightInputModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
}: WeightInputModalProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue('')
      // Small timeout to ensure the modal is rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  if (!isOpen) return null

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    const num = parseFloat(value.replace(',', '.'))
    if (!isNaN(num) && num > 0) {
      onConfirm(num)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="history-modal-overlay" onClick={onClose}>
      <div
        className="weight-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Ingresar Peso: {productName}</h3>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            step="0.001"
            className="weight-modal-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.000"
          />
          <div className="weight-modal-buttons">
            <button type="button" className="weight-modal-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="weight-modal-confirm">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
