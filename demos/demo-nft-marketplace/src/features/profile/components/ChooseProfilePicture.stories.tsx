import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import ChooseProfilePicture from './ChooseProfilePicture';

export default {
  title: 'Choose Profile Picture',
  component: ChooseProfilePicture,
  decorators: [withKnobs],
} as ComponentMeta<typeof ChooseProfilePicture>;

const Template: ComponentStory<typeof ChooseProfilePicture> = (args) => <ChooseProfilePicture {...args} />;

export const Default = Template.bind({});
Default.args = {};
