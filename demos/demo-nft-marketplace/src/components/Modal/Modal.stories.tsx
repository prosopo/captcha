import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import Modal from './Modal';
import { useToggle } from 'hooks/useToggle';
import Button from 'components/Button';

export default {
  title: 'Modal',
  component: Modal,
  decorators: [withKnobs],
} as ComponentMeta<typeof Modal>;

const Template: ComponentStory<typeof Modal> = (args) => {
  const [isOpen, toggleIsOpen] = useToggle(false);
  return (
    <>
      <div>
        <button
          type="button"
          onClick={toggleIsOpen}
          className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md bg-opacity-20 hover:bg-opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          Open dialog
        </button>
      </div>
      <Modal isOpen={isOpen} onClose={toggleIsOpen} {...args}>
        <div className={'flex flex-1 justify-center'}>
          <Button title={'Add Funds'} onClick={toggleIsOpen} />
        </div>
      </Modal>
    </>
  );
};

export const Default = Template.bind({});
Default.args = {
  title: 'Checkout',
  description: 'You are about to purchase a #44 Hopper - Abduction from Virtual Land Alliance',
};
