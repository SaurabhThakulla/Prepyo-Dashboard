import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * The question every mock asks before its paper is sent for marking: a test
 * cannot be changed once it is submitted, so the learner says yes first.
 */
export default function ConfirmSubmit({
  open,
  onCancel,
  onConfirm,
  title = 'Do you want to submit your test?',
  description,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={next => !next && onCancel()}>
      <DialogContent centered>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? 'You cannot change your answers after this.'}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="min-w-[96px]">
            No
          </Button>
          <Button
            autoFocus
            onClick={() => {
              onCancel();
              onConfirm();
            }}
            className="min-w-[96px]"
          >
            Yes, submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
