'use client'

import { useState, ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Trash2, CheckCircle, Info } from 'lucide-react'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  children?: ReactNode
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = 'Êtes-vous sûr ?',
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'danger',
  children,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <Trash2 className="h-6 w-6 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case 'info':
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  const getButtonVariant = () => {
    switch (variant) {
      case 'danger':
      case 'warning':
        return 'destructive'
      default:
        return 'default'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {getIcon()}
            <DialogTitle>{title}</DialogTitle>
          </div>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <div className="py-4">{children}</div>}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook pour utiliser facilement le dialog de confirmation
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'>
    onConfirm: () => void
  }>({
    open: false,
    config: {},
    onConfirm: () => {},
  })

  const confirm = (
    config: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'onConfirm'> & {
      onConfirm: () => void
    }
  ) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        config,
        onConfirm: () => {
          config.onConfirm()
          resolve(true)
        },
      })
    })
  }

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => {
        setState((prev) => ({ ...prev, open }))
        if (!open) {
          // Resolved as cancelled
        }
      }}
      onConfirm={state.onConfirm}
      {...state.config}
    />
  )

  return { confirm, dialog }
}
