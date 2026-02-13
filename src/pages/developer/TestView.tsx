import { useState } from "react";

import { Button } from "@/components/buttons/Button";

// mostly empty view, add whatever you need
export default function TestView() {
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error("I crashed");
  }

  return <Button onClick={() => setShouldCrash(true)}>Crash me!</Button>;
}
