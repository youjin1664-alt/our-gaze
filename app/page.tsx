import Overlay from "@/components/Overlay";
import Scene from "@/components/Scene";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "@/components/constants";

export default function Home() {
  return (
    <div
      style={{
        position: "relative",
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        overflow: "hidden",
      }}
    >
      <Scene />
      <Overlay />
    </div>
  );
}
