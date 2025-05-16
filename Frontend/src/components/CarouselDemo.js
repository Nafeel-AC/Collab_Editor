import React from "react";
import { Carousel, Card } from "./apple-cards-carousel";

const DummyContent = () => {
  return (
    <>
      {[...new Array(3).fill(1)].map((_, index) => {
        return (
          <div
            key={"dummy-content" + index}
            className="bg-[#1A1D23] p-8 md:p-14 rounded-3xl mb-4"
          >
            <p className="text-gray-400 text-base md:text-2xl font-sans max-w-3xl mx-auto">
              <span className="font-bold text-white">
                Code together, build together.
              </span>{" "}
              Share your code in real-time, collaborate with team members, and
              get instant feedback. Our collaborative editor makes team coding
              seamless and efficient.
            </p>
            <img
              src="/path-to-your-image.png"
              alt="Code collaboration"
              className="md:w-1/2 md:h-1/2 h-full w-full mx-auto object-contain"
            />
          </div>
        );
      })}
    </>
  );
};

const data = [
  {
    category: "Real-time Collaboration",
    title: "Code Together in Real-time",
    src: "https://images.unsplash.com/photo-1600132806370-bf17e65e942f",
    content: <DummyContent />,
  },
  {
    category: "Features",
    title: "Multi-language Support",
    src: "https://images.unsplash.com/photo-1587620962725-abab7fe55159",
    content: <DummyContent />,
  },
  {
    category: "Integration",
    title: "Git Version Control",
    src: "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb",
    content: <DummyContent />,
  }
];

export function CarouselDemo() {
  const cards = data.map((card, index) => (
    <Card key={card.src} card={card} index={index} />
  ));

  return (
    <div className="w-full h-full py-20 bg-black">
      <h2 className="max-w-7xl pl-4 mx-auto text-xl md:text-5xl font-bold text-white font-sans">
        Experience Collaborative Coding
      </h2>
      <Carousel items={cards} />
    </div>
  );
}
