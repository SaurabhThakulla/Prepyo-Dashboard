import React, { forwardRef } from 'react';
import SpeakingItem from './SpeakingItem';
import WritingItem from './WritingItem';
import ReadingItem from './ReadingItem';
import ListeningItem from './ListeningItem';
import { ItemHandle, ItemProps } from './types';

/**
 * The item on screen, drawn by the component for its kind of task. The task's
 * skill decides: every speaking task shares one player, every writing task one
 * box, and so on, with the task's own timings and instructions from the server.
 */
const PteItem = forwardRef<ItemHandle, ItemProps>(function PteItem(props, ref) {
  switch (props.item.task.skill) {
    case 'speaking':
      return <SpeakingItem ref={ref} {...props} />;
    case 'writing':
      return <WritingItem ref={ref} {...props} />;
    case 'reading':
      return <ReadingItem ref={ref} {...props} />;
    default:
      return <ListeningItem ref={ref} {...props} />;
  }
});

export default PteItem;
