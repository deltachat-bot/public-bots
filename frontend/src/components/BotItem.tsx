import {
  IonItem,
  IonLabel,
  IonChip,
  IonBadge,
  IonIcon,
  IonAvatar,
} from "@ionic/react";
import { languageOutline, openOutline } from "ionicons/icons";

import { Bot } from "../store";
import "./BotItem.css";

export default function BotItem({ bot }: { bot: Bot }) {
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
            <IonAvatar>
              <img src="icon.png" />
            </IonAvatar>
            <IonLabel>{bot.addr} </IonLabel>
            <IonIcon icon={openOutline} />
          </IonChip>
        </a>
        <br />
        <IonBadge color="light">
          <IonIcon icon={languageOutline} /> {bot.lang.label}
        </IonBadge>
        <p className="ion-text-wrap">{bot.description}</p>
        <p>
          <strong>Admin: </strong>
          <a target="_blank" rel="noopener noreferrer" href={bot.admin.url}>
            {bot.admin.name}
            <IonIcon icon={openOutline} />
          </a>
        </p>
      </IonLabel>
    </IonItem>
  );
}
