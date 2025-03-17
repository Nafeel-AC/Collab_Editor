import React from "react";
import { MacbookScroll } from "./macbook-scroll";

export function MacbookDemo() {
  return (
    <div className="overflow-hidden dark:bg-[#0B0B0F] bg-black w-full">
      <MacbookScroll
        title={
          <span className="text-white">
            Real-time collaborative coding <br /> made simple.
          </span>
        }
        src="https://cdn.pixabay.com/photo/2014/10/05/19/02/binary-code-475664_1280.jpg"
        showGradient={true}
      />
    </div>
  );
}
