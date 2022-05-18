import FileType from 'file-type/browser';
import React, { FC, useCallback, useEffect, useState } from 'react';

type Props = {
  dataToDisplay: Blob;
  omitStyles?: boolean;
};

const AssetDisplay: FC<Props> = ({ dataToDisplay, omitStyles = false }) => {
  const [dataType, setDataType] = useState(null);
  const [dataURL, setDataURL] = useState('');
  const determineType = useCallback(
    async (dataToDisplay) => {
      //TODO improve
      if (dataToDisplay.type || dataToDisplay.type == '') {
        const reader = new FileReader();
        reader.addEventListener(
          'load',
          async function () {
            const type = await FileType.fromBlob(dataToDisplay);
            setDataType(type.mime);
            const url = URL.createObjectURL(dataToDisplay);
            setDataURL(url);
          },
          false
        );

        reader.readAsDataURL(dataToDisplay);
      } else {
        const dataURL = URL.createObjectURL(dataToDisplay);
        const type = await FileType.fromBlob(dataToDisplay);
        setDataType(type.mime);
        setDataURL(dataURL);
      }
    },
    [setDataType, setDataURL]
  );
  useEffect(() => {
    if (!dataToDisplay) {
      return;
    }
    determineType(dataToDisplay);
  }, [dataToDisplay]);

  return (
    <>
      {dataType?.startsWith('video') && (
        <video controls src={dataURL} className={`${omitStyles ? '' : 'p-5 lg:p-16 w-full h-full'}`} />
      )}
      {dataType?.startsWith('audio') && (
        <video controls src={dataURL} className={`${omitStyles ? '' : 'p-5 lg:p-16 w-full h-full'}`} />
      )}
      {dataType?.startsWith('image') && (
        <img src={dataURL} className={`${omitStyles ? '' : 'p-5 lg:p-16 w-full object-contain'} `} />
      )}
      {(dataType?.startsWith('model') || dataType === '') && (
        <>
          {/*
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore */}
          <model-viewer
            src={dataURL}
            ios-src=""
            alt="A 3D model"
            shadow-intensity="1"
            camera-controls
            auto-rotate
            ar
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
          ></model-viewer>
        </>
      )}
    </>
  );
};
export default AssetDisplay;
