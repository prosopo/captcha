import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';
import Button, { ButtonType } from './Button';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { TwitterIcon } from 'assets';

export default {
  title: 'Button',
  component: Button,
  decorators: [withKnobs],
} as ComponentMeta<typeof Button>;

const Template: ComponentStory<typeof Button> = (args) => <Button {...args} />;

export const PrimaryButton = Template.bind({});
PrimaryButton.args = {
  children: 'Button',
  title: 'Create Item',
  type: ButtonType.Primary,
  onClick: () => {
    alert('clicked');
  },
};

export const SecondaryButton = Template.bind({});
SecondaryButton.args = {
  ...PrimaryButton.args,
  type: ButtonType.Secondary,
  title: 'Preview',
};

export const MainButton = Template.bind({});
MainButton.args = {
  ...PrimaryButton.args,
  type: ButtonType.Main,
  title: 'Recently Added',
};

export const TwitterButton = Template.bind({});
TwitterButton.args = {
  ...PrimaryButton.args,
  type: ButtonType.Main,
  icon: TwitterIcon,
  title: null,
};
