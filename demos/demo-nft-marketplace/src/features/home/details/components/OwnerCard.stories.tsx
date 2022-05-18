import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import OwnerCard from './OwnerCard';
import { Currency, NFTOwner } from 'types';

export default {
  title: 'Owner Card',
  component: OwnerCard,
  decorators: [withKnobs],
} as ComponentMeta<typeof OwnerCard>;

const Template: ComponentStory<typeof OwnerCard> = (args) => <OwnerCard {...args} />;

export const Default = Template.bind({});
Default.args = {
  total: 10,
  data: {
    avatarUrl: 'https://avatars.githubusercontent.com/u/6930914?v=4',
    price: '10,02',
    currency: Currency.ETH,
    name: 'mladibejn',
    quantity: 2,
  } as NFTOwner,
};
