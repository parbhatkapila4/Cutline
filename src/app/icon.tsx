import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import path from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const imgPath = path.join(process.cwd(), "public", "Logo.png");
  const buffer = readFileSync(imgPath);
  const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          overflow: "hidden",
        }}
      >
        <img
          src={dataUri}
          alt=""
          width={52}
          height={52}
          style={{ objectFit: "cover" }}
        />
      </div>
    ),
    { ...size }
  );
}
