import { withKnobs } from '@storybook/addon-knobs';
import TextInput from './TextInput';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useForm } from 'react-hook-form';

export default {
  title: 'Text Input',
  component: TextInput,
  decorators: [withKnobs],
} as ComponentMeta<typeof TextInput>;

const Template: ComponentStory<typeof TextInput> = (args) => {
  const form = useForm();
  return <TextInput {...args} form={form} />;
};

export const Regular = Template.bind({});
Regular.args = {
  children: 'TextInput',
  name: 'copies',
  label: 'Number of copies',
  placeholder: 'E.g. 10',
  helperText: 'Amount of Tokens',
};
