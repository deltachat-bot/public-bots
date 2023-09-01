import { IonAvatar } from "@ionic/react";
// @ts-ignore
import getRGB from "consistent-color-generation";

export default function TextAvatar({ text }: { text: string }) {
  const backgroundColor = getRGB(text).toString();
  const textColor = "#ffffff";
  const fontFamily = "Arial";
  const fontSize = 50;
  const svg = btoa(
    `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' x='0' y='0' fill='${backgroundColor}'></rect><text x='50%' y='50%' alignment-baseline='central' text-anchor='middle' font-family='${fontFamily}' font-size='${fontSize}' fill='${textColor}' dominant-baseline='middle'>${text.charAt(
      0,
    )}</text></svg>`,
  );
  const url = `data:image/svg+xml;base64,${svg}`;
  return (
    <IonAvatar>
      <img src={url} />
    </IonAvatar>
  );
}
