import React, { FC } from 'react';
import Arrow from './Arrow.svg';
import styles from './Breadcrumb.module.css';

const SELECTED_TEXT_COLOR = 'text-transparent bg-clip-text bg-gradient-to-b from-primary-start to-primary-stop';

type BreadcrumbItem = { label: string; url: string };

type Props = {
  path: BreadcrumbItem[];
};

const Breadcrumb: FC<Props> = ({ path }) => {
  const pathLength = path.length;
  return (
    <nav
      className={`${styles.breadcrumb} text-white relative flex w-max bg-green bg-secondary py-2`}
      aria-label="Breadcrumb"
    >
      <ol role="list" className="flex px-6 rounded-md space-x-4">
        {path.map((item, idx) => (
          <li key={idx} className="flex">
            <div className="flex items-center">
              <a
                href={item.url}
                className={`text-sm font-medium hover:text-primary-stop ${
                  pathLength === idx + 1 ? SELECTED_TEXT_COLOR : ''
                }`}
              >
                <span>{item.label}</span>
              </a>
            </div>
            {pathLength !== idx + 1 && <img className="flex-shrink-0 w-4 ml-4" src={Arrow} />}
          </li>
        ))}
      </ol>
    </nav>
  );
};
export default Breadcrumb;
