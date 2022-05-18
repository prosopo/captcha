import React from 'react';
import { withKnobs } from '@storybook/addon-knobs';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import ProductList from './ProductList';

export default {
  title: 'ProductList',
  component: ProductList,
  decorators: [withKnobs],
} as ComponentMeta<typeof ProductList>;

const Template: ComponentStory<typeof ProductList> = (args) => <ProductList {...args} />;

const dummyItems = [
  {
    id: '123',
    title: 'Product 1',
    imageUrl: 'https://as1.ftcdn.net/v2/jpg/03/46/83/96/1000_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg',
    description: 'random',
    createdQuantity: 24,
    availableQuantity: 1,
    likes: 24,
    price: 0.1,
    ownerUsername: 'random',
    ownerProfileImageUrl:
      'https://as1.ftcdn.net/v2/jpg/03/46/83/96/1000_F_346839683_6nAPzbhpSkIpb8pmAwufkC7c5eD7wYws.jpg',
  },
  {
    id: '123',
    title: 'Product 1',
    imageUrl:
      'https://images.unsplash.com/photo-1494253109108-2e30c049369b?ixid=MnwxMjA3fDB8MHxzZWFyY2h8Mnx8cmFuZG9tJTIwZm9vZCUyMHN0b3JlfGVufDB8fDB8fA%3D%3D&ixlib=rb-1.2.1&w=1000&q=80',
    description: 'random',
    createdQuantity: 24,
    availableQuantity: 1,
    likes: 24,
    price: 0.1,
    ownerUsername: 'random',
    ownerProfileImageUrl:
      'https://st3.depositphotos.com/15648834/17930/v/600/depositphotos_179308454-stock-illustration-unknown-person-silhouette-glasses-profile.jpg',
  },
  {
    id: '123',
    title: 'Product 1',
    imageUrl: 'http://www.mandysam.com/img/random.jpg',
    description: 'random',
    createdQuantity: 24,
    availableQuantity: 1,
    likes: 24,
    price: 0.1,
    ownerUsername: 'random',
    ownerProfileImageUrl:
      'https://cdn.fastly.picmonkey.com/contentful/h6goo9gw1hh6/2sNZtFAWOdP1lmQ33VwRN3/24e953b920a9cd0ff2e1d587742a2472/1-intro-photo-final.jpg?w=800&q=70',
  },
];
export const Default = Template.bind({});
Default.args = {
  items: new Array(5)
    .fill(dummyItems)
    .flat()
    .map((item) => ({ ...item, id: Math.random() })),
};
