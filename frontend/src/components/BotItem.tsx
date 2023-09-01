import {
  IonItem,
  IonLabel,
  IonChip,
  IonBadge,
  IonIcon,
  IonAvatar,
} from "@ionic/react";
import { languageOutline, openOutline } from "ionicons/icons";

import TextAvatar from "./TextAvatar";
import { Bot, recently } from "../store";
import { getText as _ } from "../i18n";
import "./BotItem.css";

const longAgo = 1000 * 60 * 60 * 24 * 360 * 10;

function displayLastSeen(lastSync: Date, lastSeen: Date) {
  if (lastSeen) {
    let label;
    let color;
    let timeAgo = lastSync.getTime() - lastSeen.getTime();
    if (timeAgo <= recently) {
      color = "success";
      label = "online";
    } else {
      color = "danger";
      if (timeAgo >= longAgo) {
        label = "offline";
      } else {
        label = "offline (" + lastSeen.toLocaleString() + ")";
      }
    }
    return <IonBadge color={color}>{label}</IonBadge>;
  }
  return false;
}

export default function BotItem({
  bot,
  lastSync,
}: {
  bot: Bot;
  lastSync: Date;
}) {
  return (
    <IonItem>
      <IonLabel>
        <a
          className="botChip"
          target="_blank"
          rel="noopener noreferrer"
          href={bot.url}
        >
          <IonChip>
            <TextAvatar text={bot.addr} />
            <IonLabel>{bot.addr} </IonLabel>
            <IonIcon icon={openOutline} />
          </IonChip>
        </a>
        <br />
        <IonBadge color="light">
          <IonIcon icon={languageOutline} /> {bot.lang.label}
        </IonBadge>{" "}
        {displayLastSeen(lastSync || new Date(), bot.lastSeen)}
        <p className="ion-text-wrap">{bot.description}</p>
        <p>
          <strong>{_("admin")}</strong>
          <a target="_blank" rel="noopener noreferrer" href={bot.admin.url}>
            {bot.admin.name}
            <IonIcon icon={openOutline} />
          </a>
        </p>
      </IonLabel>
    </IonItem>
  );
}
