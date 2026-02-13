"use client";

import PixelBlast from "./PixelBlast";

export default function ClientBackground() {
  return (
    <div className="fixed top-0 left-0 w-full h-screen">
      <div className="absolute inset-0 bg-gradient-to-b from-dark-gradient-start to-dark-gradient-end"></div>
      <div className="absolute inset-0 parallax-bg"></div>
      <PixelBlast
        variant="circle"
        pixelSize={6}
        color="#f00"
        patternScale={7}
        patternDensity={0.8}
        pixelSizeJitter={0.5}
        enableRipples
        rippleSpeed={0.4}
        rippleThickness={0.12}
        rippleIntensityScale={1.5}
        liquid
        liquidStrength={0.12}
        liquidRadius={1.2}
        liquidWobbleSpeed={5}
        speed={0.6}
        edgeFade={0}
        transparent
      />
    </div>
  );
}
