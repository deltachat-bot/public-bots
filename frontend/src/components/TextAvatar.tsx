import { IonAvatar } from "@ionic/react";
import { useEffect } from "react";
// @ts-ignore
import getRGB from "consistent-color-generation";

type Props = { name: string; id: string };

export default function TextAvatar({ name, id }: Props) {
  const blob = new Blob([createSVG(name, id)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [name, id]);

  return (
    <IonAvatar>
      <img src={url} />
    </IonAvatar>
  );
}

function createSVG(name: string, id: string): string {
  const backgroundColor = getRGB(id || name).toString();
  const letter = (name || id).charAt(0);
  const textColor = "#ffffff";
  const fontFamily = "Arial";
  const fontSize = 50;
  return `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 100 100' width='100' height='100'><rect width='100' height='100' x='0' y='0' fill='${backgroundColor}'></rect><text x='50%' y='50%' alignment-baseline='central' text-anchor='middle' font-family='${fontFamily}' font-size='${fontSize}' fill='${textColor}' dominant-baseline='middle'>${letter}</text></svg>`;
}
