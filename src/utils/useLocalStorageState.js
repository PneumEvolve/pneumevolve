// src/utils/useLocalStorageState.js
import { useEffect, useState } from "react";
import { lsLoad, lsSave } from "./ls";

export default function useLocalStorageState(key, initialValue) {
  const [state, setState] = useState(() => lsLoad(key, typeof initialValue === "function" ? initialValue() : initialValue));

  useEffect(() => {
    lsSave(key, state);
  }, [key, state]);

  return [state, setState];
}