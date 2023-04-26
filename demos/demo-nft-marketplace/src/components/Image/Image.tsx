import React from 'react';
import NextImage, { ImageProps } from 'next/image';

type Props = Omit<ImageProps, 'layout'>;

const shimmer = (w = 100, h = 100) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#fff0" offset="20%" />
      <stop stop-color="#fffa" offset="50%" />
      <stop stop-color="#fff0" offset="80%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#0000" />
  <rect id="r" width="${w / 2}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1s" repeatCount="indefinite"  />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === 'undefined' ? Buffer.from(str).toString('base64') : window.btoa(str);

function Image({ alt, ...props }: Props) {
  return (
    <div className={props.className} style={{ position: 'relative' }}>
      {props.src && (
        <NextImage
          {...props}
          layout="fill"
          placeholder="blur"
          blurDataURL={`data:image/svg+xml;base64,${toBase64(shimmer())}`}
          alt={alt || props.src.toString()}
        />
      )}
    </div>
  );
}

export default Image;
