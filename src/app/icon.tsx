import { ImageResponse } from "next/og";
import { IconeBase } from "./icone-base";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<IconeBase lado={512} />, size);
}
