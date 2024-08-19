// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { startCollector } from "@prosopo/procaptcha";
import type {
  Account,
  ProsopoKeyboardEvent,
  ProsopoMouseEvent,
  ProsopoTouchEvent,
  StoredEvents,
} from "@prosopo/types";
import { type MutableRefObject, useEffect, useRef, useState } from "react";

type CollectorProps = {
  onProcessData: (data: StoredEvents) => void;
  sendData: boolean;
  account: Account | undefined;
};

const Collector = ({ onProcessData, sendData, account }: CollectorProps) => {
  const [mouseEvents, setStoredMouseEvents] = useState<ProsopoMouseEvent[]>([]);
  const [touchEvents, setStoredTouchEvents] = useState<ProsopoTouchEvent[]>([]);
  const [keyboardEvents, setStoredKeyboardEvents] = useState<
    ProsopoKeyboardEvent[]
  >([]);

  const ref: MutableRefObject<HTMLDivElement | null> =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref?.current) {
      startCollector(
        setStoredMouseEvents,
        setStoredTouchEvents,
        setStoredKeyboardEvents,
        ref.current,
      );
    }
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: TODO should depend on mouse/touch/kb events, but I think this will break things
  useEffect(() => {
    const userEvents = {
      mouseEvents,
      touchEvents,
      keyboardEvents,
    };
    if (account) onProcessData(userEvents);
  }, [onProcessData, account]);

  return <div ref={ref} />;
};

export default Collector;
