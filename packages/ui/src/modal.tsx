'use client';
/**
 * URL-driven modal: the page renders <Modal> only when a query param says it's open,
 * and closing navigates to `closeHref`. That keeps modals linkable and back-button safe.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import clsx from 'clsx';

export function Modal({ title, subtitle, closeHref, children, footer, width = 720 }: {
  title: ReactNode; subtitle?: ReactNode; closeHref: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  const router = useRouter();
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) router.push(closeHref, { scroll: false }); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(33_25_36/0.45)]" />
        <Dialog.Content
          className={clsx('fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-48px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-page shadow-modal focus:outline-none')}
          style={{ maxWidth: width }}
        >
          <div className="flex items-start gap-3 px-7 pb-3 pt-6">
            <div className="flex flex-col gap-0.5">
              <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
              {subtitle ? <Dialog.Description className="text-[13px] text-muted">{subtitle}</Dialog.Description> : <Dialog.Description className="sr-only">Dialog</Dialog.Description>}
            </div>
            <Dialog.Close className="hz-focus ml-auto rounded p-1 text-muted hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-7 pb-4">{children}</div>
          {footer && <div className="border-t border-line px-7 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** URL-driven side panel (slides in from the right). Same open/close rules as Modal. */
export function Panel({ title, closeHref, children, width = 420 }: { title: ReactNode; closeHref: string; children: ReactNode; width?: number }) {
  const router = useRouter();
  return (
    <Dialog.Root open onOpenChange={(o) => { if (!o) router.push(closeHref, { scroll: false }); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgb(33_25_36/0.25)]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-50 flex w-[calc(100vw-32px)] flex-col gap-[18px] overflow-y-auto bg-page p-7 shadow-[-8px_0_32px_rgba(0,0,0,0.18)] focus:outline-none" style={{ maxWidth: width }}>
          <div className="flex items-center gap-3">
            <Dialog.Title className="flex-1 text-xl font-semibold">{title}</Dialog.Title>
            <Dialog.Description className="sr-only">Panel</Dialog.Description>
            <Dialog.Close className="hz-focus rounded p-1 text-muted hover:text-ink" aria-label="Close"><X size={18} /></Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
