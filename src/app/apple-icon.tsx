import { ImageResponse } from "next/og";
import { IconeBase } from "./icone-base";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<IconeBase lado={180} />, size);
}
