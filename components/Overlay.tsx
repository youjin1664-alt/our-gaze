import Image from "next/image";
import { BASE_PATH } from "./basePath";
import { CANVAS_WIDTH } from "./constants";

export default function Overlay() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      <Image
        src={`${BASE_PATH}/images/pc_project_header.png`}
        alt=""
        width={1440}
        height={80}
        style={{ position: "absolute", top: 0, left: 0 }}
        priority
      />
      <Image
        src={`${BASE_PATH}/images/ui.png`}
        alt=""
        width={1354}
        height={55}
        style={{ position: "absolute", top: 100, left: (CANVAS_WIDTH - 1354) / 2 }}
        priority
      />
      <Image
        src={`${BASE_PATH}/images/pc_project_footer.png`}
        alt=""
        width={1440}
        height={80}
        style={{ position: "absolute", bottom: 0, left: 0 }}
        priority
      />
    </div>
  );
}
