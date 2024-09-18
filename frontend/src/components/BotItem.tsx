import {
  IonItem,
  IonGrid,
  IonCol,
  IonRow,
  IonLabel,
  IonCard,
  IonNote,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonBadge,
  IonIcon,
  IonAvatar,
} from "@ionic/react";
import {
  languageOutline,
  chatbubbleEllipsesOutline,
  shareSocialOutline,
} from "ionicons/icons";

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

type Props = {
  bot: Bot;
  lastSync: Date;
};

export default function BotItem({ bot, lastSync }: Props) {
  const shareURL = () => window.webxdc.sendToChat({ text: bot.inviteLink });

  return (
    <IonCard>
      <IonCardHeader className="ion-no-padding">
        <IonCardTitle>
          <IonItem color="light" className="contact-item" lines="none">
            <TextAvatar name={bot.name} id={bot.addr} />
            <IonLabel className="contact-title">
              {bot.name || bot.addr}
              <p className="contact-addr">
                <IonNote className="contact-addr">{bot.addr}</IonNote>
              </p>
            </IonLabel>
          </IonItem>
        </IonCardTitle>
      </IonCardHeader>

      <IonItem lines="none">
        <IonLabel className="ion-text-wrap">
          <IonBadge color="light">
            <IonIcon icon={languageOutline} /> {bot.lang.label}
          </IonBadge>{" "}
          {displayLastSeen(lastSync || new Date(), bot.lastSeen)}
          <div className="selectable">{bot.description}</div>
          <p>
            <strong>{_("admin")}</strong>
            {bot.admin.name}
          </p>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <IonButton target="_blank" href={bot.url} expand="block">
                  <IonLabel>{_("chat")}</IonLabel>
                  <IonIcon slot="end" icon={chatbubbleEllipsesOutline} />
                </IonButton>
              </IonCol>
              <IonCol size="6">
                <IonButton onClick={shareURL} fill="outline" expand="block">
                  <IonLabel>{_("share")}</IonLabel>
                  <IonIcon slot="end" icon={shareSocialOutline} />
                </IonButton>
              </IonCol>
            </IonRow>
          </IonGrid>
        </IonLabel>
      </IonItem>
    </IonCard>
  );
}
