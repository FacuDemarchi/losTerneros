type BottomControlsProps = {
  onCloseTicket: (type?: 'normal' | 'B') => void
  onSelectNormal: () => void
}

export function BottomControls({ onCloseTicket, onSelectNormal }: BottomControlsProps) {
  return (
    <div className="pos-bottom-controls">
      <button className="bottom-button bottom-button-large" onClick={() => onCloseTicket('normal')}>
        Cerrar Cliente
      </button>
      <button className="bottom-button bottom-button-large" onClick={() => onCloseTicket('B')}>
        Tiquet B
      </button>
      <button className="bottom-button bottom-button-small" onClick={onSelectNormal}>
        Mostrar Precios
      </button>
    </div>
  )
}

