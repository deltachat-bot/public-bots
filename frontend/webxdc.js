// debug friend: document.writeln(JSON.stringify(value));
//@ts-check
/** @type {import('./webxdc').Webxdc<any>} */
window.webxdc = (() => {
  var updateListener = (_) => {};
  var updatesKey = "__xdcUpdatesKey__";
  window.addEventListener("storage", (event) => {
    if (event.key == null) {
      window.location.reload();
    } else if (event.key === updatesKey) {
      var updates = JSON.parse(event.newValue);
      var update = updates[updates.length - 1];
      update.max_serial = updates.length;
      console.log("[Webxdc] " + JSON.stringify(update));
      updateListener(update);
    }
  });

  function getUpdates() {
    var updatesJSON = window.localStorage.getItem(updatesKey);
    return updatesJSON ? JSON.parse(updatesJSON) : [];
  }

  var params = new URLSearchParams(window.location.hash.substr(1));
  return {
    selfAddr: params.get("addr") || "device0@local.host",
    selfName: params.get("name") || "device0",
    setUpdateListener: (cb, serial = 0) => {
      var updates = getUpdates();
      var maxSerial = updates.length;
      updates.forEach((update) => {
        if (update.serial > serial) {
          update.max_serial = maxSerial;
          cb(update);
        }
      });
      updateListener = cb;
      return Promise.resolve();
    },
    getAllUpdates: () => {
      console.log("[Webxdc] WARNING: getAllUpdates() is deprecated.");
      return Promise.resolve([]);
    },
    sendUpdate: (update, description) => {
      var updates = getUpdates();
      var serial = updates.length + 1;
      var _update = {
        payload: update.payload,
        summary: update.summary,
        info: update.info,
        serial: serial,
      };
      updates.push(_update);
      window.localStorage.setItem(updatesKey, JSON.stringify(updates));
      _update.max_serial = serial;
      console.log(
        '[Webxdc] description="' + description + '", ' + JSON.stringify(_update)
      );
      updateListener(_update);
    },
    sendToChat: async (content) => {
      if (!content.file && !content.text) {
        alert("🚨 Error: either file or text need to be set. (or both)");
        return Promise.reject(
          "Error from sendToChat: either file or text need to be set"
        );
      }

      /** @type {(file: Blob) => Promise<string>} */
      const blob_to_base64 = (file) => {
        const data_start = ";base64,";
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            /** @type {string} */
            //@ts-ignore
            let data = reader.result;
            resolve(data.slice(data.indexOf(data_start) + data_start.length));
          };
          reader.onerror = () => reject(reader.error);
        });
      };

      let base64Content;
      if (content.file) {
        if (!content.file.name) {
          return Promise.reject("file name is missing");
        }
        if (
          Object.keys(content.file).filter((key) =>
            ["blob", "base64", "plainText"].includes(key)
          ).length > 1
        ) {
          return Promise.reject(
            "you can only set one of `blob`, `base64` or `plainText`, not multiple ones"
          );
        }

        // @ts-ignore - needed because typescript imagines that blob would not exist
        if (content.file.blob instanceof Blob) {
          // @ts-ignore - needed because typescript imagines that blob would not exist
          base64Content = await blob_to_base64(content.file.blob);
          // @ts-ignore - needed because typescript imagines that base64 would not exist
        } else if (typeof content.file.base64 === "string") {
          // @ts-ignore - needed because typescript imagines that base64 would not exist
          base64Content = content.file.base64;
          // @ts-ignore - needed because typescript imagines that plainText would not exist
        } else if (typeof content.file.plainText === "string") {
          base64Content = await blob_to_base64(
            // @ts-ignore - needed because typescript imagines that plainText would not exist
            new Blob([content.file.plainText])
          );
        } else {
          return Promise.reject(
            "data is not set or wrong format, set one of `blob`, `base64` or `plainText`, see webxdc documentation for sendToChat"
          );
        }
      }
      const msg = `The app would now close and the user would select a chat to send this message:\nText: ${
        content.text ? `"${content.text}"` : "No Text"
      }\nFile: ${
        content.file
          ? `${content.file.name} - ${base64Content.length} bytes`
          : "No File"
      }`;
      if (content.file) {
        const confirmed = confirm(
          msg + "\n\nDownload the file in the browser instead?"
        );
        if (confirmed) {
          var element = document.createElement("a");
          element.setAttribute(
            "href",
            "data:application/octet-stream;base64," + base64Content
          );
          element.setAttribute("download", content.file.name);
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
      } else {
        alert(msg);
      }
    },
    importFiles: (filters) => {
      var element = document.createElement("input");
      element.type = "file";
      element.accept = [
        ...(filters.extensions || []),
        ...(filters.mimeTypes || []),
      ].join(",");
      element.multiple = filters.multiple || false;
      const promise = new Promise((resolve, _reject) => {
        element.onchange = (_ev) => {
          console.log("element.files", element.files);
          const files = Array.from(element.files || []);
          document.body.removeChild(element);
          resolve(files);
        };
      });
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      console.log(element);
      return promise;
    },
  };
})();

window.addXdcPeer = () => {
  var loc = window.location;
  // get next peer ID
  var params = new URLSearchParams(loc.hash.substr(1));
  var peerId = Number(params.get("next_peer")) || 1;

  // open a new window
  var peerName = "device" + peerId;
  var url =
    loc.protocol +
    "//" +
    loc.host +
    loc.pathname +
    "#name=" +
    peerName +
    "&addr=" +
    peerName +
    "@local.host";
  window.open(url);

  // update next peer ID
  params.set("next_peer", String(peerId + 1));
  window.location.hash = "#" + params.toString();
};

window.clearXdcStorage = () => {
  window.localStorage.clear();
  window.location.reload();
};

window.alterXdcApp = () => {
  var styleControlPanel =
    "position: fixed; bottom:1em; left:1em; background-color: #000; opacity:0.8; padding:.5em; font-size:16px; font-family: sans-serif; color:#fff; z-index: 9999";
  var styleMenuLink =
    "color:#fff; text-decoration: none; vertical-align: middle";
  var styleAppIcon =
    "height: 1.5em; width: 1.5em; margin-right: 0.5em; border-radius:10%; vertical-align: middle";
  var title = document.getElementsByTagName("title")[0];
  if (typeof title == "undefined") {
    title = document.createElement("title");
    document.getElementsByTagName("head")[0].append(title);
  }
  title.innerText = window.webxdc.selfAddr;

  if (window.webxdc.selfName === "device0") {
    var div = document.createElement("div");
    div.innerHTML =
      '<div id="webxdc-panel" style="' +
      styleControlPanel +
      '">' +
      '<a href="javascript:window.addXdcPeer();" style="' +
      styleMenuLink +
      '">Add Peer</a>' +
      '<span style="' +
      styleMenuLink +
      '"> | </span>' +
      '<a id="webxdc-panel-clear" href="javascript:window.clearXdcStorage();" style="' +
      styleMenuLink +
      '">Clear Storage</a>' +
      "<div>";
    var controlPanel = div.firstChild;

    function loadIcon(name) {
      var tester = new Image();
      tester.onload = () => {
        div.innerHTML = '<img src="' + name + '" style="' + styleAppIcon + '">';
        controlPanel.insertBefore(div.firstChild, controlPanel.firstChild);
      };
      tester.src = name;
    }
    loadIcon("icon.png");
    loadIcon("icon.jpg");

    document.getElementsByTagName("body")[0].append(controlPanel);
  }
};

//window.addEventListener("load", window.alterXdcApp);

// mock data
window.webxdc.sendUpdate(
  {
    payload: {
      error: null,
      id: "sync",
      result: {
        data: {
          admins: { adbenitez: { url: "mailto:adbenitez@hispanilandia.net" } },
          bots: [
            {
              addr: "adb_bot1@testrun.org",
              admin: "adbenitez",
              description: "Web gateway, get URL previews and download files",
              lang: "en",
              url: "OPENPGP4FPR:8D0025A5DDA22D50EB38A731DC8D7EB24BECDFEB#a=adb%5Fbot1%40testrun.org&n=www&i=N2ZpQ9wDKLq&s=lr1Z8T3TlOI",
            },
            {
              addr: "superrrrlonggggaddresssbottttt@superlong.domain.org",
              admin: "adbenitez",
              description: "A bot with a super long address and description is also super long, very very long, as you can probably notice by now, this is quite the long detailed description for an imaginary bot, hope you enjoy using this bot, please support us sharing the word, thanks in advance! and thanks for reading this much! we work hard to improve our bot description, stay tuned",
              lang: "en",
              url: "OPENPGP4FPR:8D0025A5DDA22D50EB38A731DC8D7EB24BECDFEB#a=adb%5Fbot1%40testrun.org&n=www&i=N2ZpQ9wDKLq&s=lr1Z8T3TlOI",
            },
            {
              addr: "cartelera@hispanilandia.net",
              admin: "adbenitez",
              description: "Permite consultar la cartelera de la TV cubana",
              lang: "es",
              url: "OPENPGP4FPR:D0E1D04F7CB4DF675FF40C16B8757470D98E7742#a=cartelera%40hispanilandia.net&n=Cartelera%20TV&i=bE_sYQa0JZD&s=eyf5eQIShJT",
            },
            {
              addr: "chatbot@testrun.org",
              admin: "adbenitez",
              description: "Conversational AI bot, talk to it in private",
              lang: "multi",
              url: "OPENPGP4FPR:ACB006F0EF18032E1992A64BF1BD44F8385AE3D4#a=chatbot%40testrun.org&n=ChatBot&i=mbY70x0thoC&s=kB_C5bW3jIr",
            },
            {
              addr: "deltabot@buzon.uy",
              admin: "adbenitez",
              description: "Miscellaneous bot",
              lang: "en",
              url: "OPENPGP4FPR:C823D993CF37BF5D8C834F8F08505516CF8AB8C8#a=deltabot%40buzon.uy&n=Misc.%20Bot&i=YMorOP_2ppb&s=LX4bGaOhVu-",
            },
            {
              addr: "deltalandbot@testrun.org",
              admin: "adbenitez",
              description: "Deltaland, fantasy world, chat adventure, MMO game",
              lang: "en",
              url: "OPENPGP4FPR:FD06CE9EA9562A51FA7FCA84B026574F9FB923A8#a=deltalandbot%40testrun.org&n=Deltaland%20Bot%20%5BBETA%5D&i=QdEBHZBR8yI&s=AuLHwV5BqVi",
            },
            {
              addr: "downloaderbot@hispanilandia.net",
              admin: "adbenitez",
              description:
                "File downloader bot, get files from the web to your inbox",
              lang: "en",
              url: "OPENPGP4FPR:83D90328467A9216D3244B5AA23F544DFED077E9#a=downloaderbot%40hispanilandia.net&n=File%20Downloader&i=v-cJnR80WCy&s=q6LqhqGfLR6",
            },
            {
              addr: "faqbot@testrun.org",
              admin: "adbenitez",
              description:
                "FAQ bot, allows saving answer to common questions or #tags",
              lang: "en",
              url: "OPENPGP4FPR:279714071CC59EB4A9943122A3B4FF4BB7264A0E#a=faqbot%40testrun.org&n=FAQ%20Bot&i=PhdQtXTJQkp&s=WAPGhvIBtEy",
            },
            {
              addr: "feedsbot@hispanilandia.net",
              admin: "adbenitez",
              description: "Allows to subscribe to RSS/Atom feeds",
              lang: "en",
              url: "OPENPGP4FPR:EDBCBD0131B2216D60F76FF46834D1E33169F00E#a=feedsbot%40hispanilandia.net&n=FeedsBot&i=7AYtkEyVmW8&s=1HWCvzIMM9M",
            },
            {
              addr: "groupsbot@hispanilandia.net",
              admin: "adbenitez",
              description:
                "Public super groups and channels (anoymous mailing lists)",
              lang: "en",
              url: "OPENPGP4FPR:6185B0FC60681A7F06A31735070D21CEEB40B859#a=groupsbot%40hispanilandia.net&n=SuperGroupsBot&i=e_XiPctpNVS&s=1NRdaNor1Rc",
            },
            {
              addr: "groupsbot@testrun.org",
              admin: "adbenitez",
              description:
                "Bot that allows to invite friends to your private groups so you don't need to be online for them to join",
              lang: "en",
              url: "OPENPGP4FPR:6FE1642916908F1AC9CC7557CC99CF5DDB92043C#a=groupsbot%40testrun.org&n=InviteBot&i=AptcQCUYP3X&s=j6C75z6IKU8",
            },
            {
              addr: "howdoi@hispanilandia.net",
              admin: "adbenitez",
              description: "Get instant coding answers from Stack Overflow",
              lang: "en",
              url: "OPENPGP4FPR:118B1592A24183E6D1922F7C8A775F662D0B8DC4#a=howdoi%40hispanilandia.net&n=How%20do%20I%3F&i=JgugrCgP01u&s=7k9-7Z62Um7",
            },
            {
              addr: "mini-apps@hispanilandia.net",
              admin: "adbenitez",
              description: "DeltaLab's Mini-Games Store 🎮",
              lang: "en",
              url: "OPENPGP4FPR:3CC3726E55E69CF4B52368C411819C7E7639B38C#a=mini%2Dapps%40hispanilandia.net&n=&i=jHGRY-9E7jd&s=cRh0KZJmfKJ",
            },
            {
              addr: "lyrics@hispanilandia.net",
              admin: "adbenitez",
              description: "Search for song lyrics 🎼🎶🎤",
              lang: "en",
              url: "OPENPGP4FPR:AAA362B3B891EDA4152DCF40D4A635364D5D9CA0#a=lyrics%40hispanilandia.net&n=LyricsBot&i=sM5oxC789zg&s=MyVVfdzw_cf",
            },
            {
              addr: "mangadl@testrun.org",
              admin: "adbenitez",
              description:
                "Manga downloader bot with support for several sites and languages",
              lang: "multi",
              url: "OPENPGP4FPR:8904D68A0B560EEEA20A06031BA3B5859361097B#a=mangadl%40testrun.org&n=MangaDownloader&i=fLXeIm7l2pP&s=Kpn1KG4fWiS",
            },
            {
              addr: "memes@hispanilandia.net",
              admin: "adbenitez",
              description: "Get funny memes",
              lang: "multi",
              url: "OPENPGP4FPR:2099C7D3744F3B62E0C11EE4CFED5478A92DA043#a=memes%40hispanilandia.net&n=Memes%20Bot&i=egz8nDAMV6q&s=oydmbu8ZV6j",
            },
            {
              addr: "polls@hispanilandia.net",
              admin: "adbenitez",
              description:
                "Polls bot, allows to create and participate in polls",
              lang: "en",
              url: "OPENPGP4FPR:B47AB02369B0DC86C05E1F1825E7EB00BD917E8D#a=polls%40hispanilandia.net&n=PollsBot&i=4usXSVZ1y_q&s=s201RPZzEDW",
            },
            {
              addr: "simplebot@systemli.org",
              admin: "adbenitez",
              description: "Allows to get link/URL previews and search the web",
              lang: "en",
              url: "OPENPGP4FPR:81B0247BFBB7E3BE20593EB0B0E0983481685179#a=simplebot%40systemli.org&n=www&i=d1JutH49hDH&s=F_Xd0SmbcXM",
            },
            {
              addr: "simplebot@testrun.org",
              admin: "adbenitez",
              description: "Mastodon/DeltaChat bridge",
              lang: "en",
              url: "OPENPGP4FPR:3CD6F460C18365C226A3115E5D5DCC2B68286A7A#a=simplebot%40testrun.org&n=MASTODON%20BRIDGE&i=vliFxNkyG5I&s=CEHn5i91saa",
            },
            {
              addr: "stickerbot@hispanilandia.net",
              admin: "adbenitez",
              description: "Allows to download sticker packs",
              lang: "en",
              url: "OPENPGP4FPR:505ABCB5FE466D5A74A0FD1A33B81CFE12CD0A8D#a=stickerbot%40hispanilandia.net&n=StickerBot&i=wM2bpwc2EzK&s=5YAwTNLcJhp",
            },
            {
              addr: "tgbridge@testrun.org",
              admin: "adbenitez",
              description: "Telegram/DeltaChat groups bridge (relay-bot)",
              lang: "en",
              url: "OPENPGP4FPR:05B5EF4667BF45AF8E437415DF14FC5F0C721EA8#a=tgbridge%40testrun.org&n=Telegram%20Bridge&i=68W2tEfJHrA&s=2wYVxvks-0M",
            },
            {
              addr: "translator@hispanilandia.net",
              admin: "adbenitez",
              description: "Translate text to any language",
              lang: "en",
              url: "OPENPGP4FPR:F6948DDA3046531A190F26FBCBD3E8DC2F7924CB#a=translator%40hispanilandia.net&n=Translator%20Bot&i=wMuG5nircgB&s=Q4r26QE7prU",
            },
            {
              addr: "uploaderbot@hispanilandia.net",
              admin: "adbenitez",
              description: "Upload files to a cloud and get the download link",
              lang: "en",
              url: "OPENPGP4FPR:9C9DA1499EDD478A80994B58C65D6348DFA09264#a=uploaderbot%40hispanilandia.net&n=File%20to%20Link&i=nB8AjS72u07&s=2WWEkH8MfBc",
            },
            {
              addr: "voice2text@hispanilandia.net",
              admin: "adbenitez",
              description: "Convert voice messages to text",
              lang: "en",
              url: "OPENPGP4FPR:7191E7BF4FA2518F608B25678CFB565A6282034B#a=voice2text%40hispanilandia.net&n=Voice%20to%20Text&i=VeVJzQnn8oL&s=HFye19A4B3z",
            },
            {
              addr: "writefreely@hispanilandia.net",
              admin: "adbenitez",
              description: "WriteFreely/DeltaChat bridge",
              lang: "en",
              url: "OPENPGP4FPR:B6F03DA7D8DF8EB6EE7E0D030A8E0B513E40D443#a=writefreely%40hispanilandia.net&n=WriteFreelyBot&i=r45fDGvqhcK&s=ZpEkv_FWyRl",
            },
            {
              addr: "web2img@testrun.org",
              admin: "adbenitez",
              description:
                "Web to Image converter, take screenshots of web sites",
              lang: "en",
              url: "OPENPGP4FPR:B854D991B27307F8393A934CEE9BFD63D19250D3#a=web2img%40testrun.org&n=Web%20to%20Image&i=le_x0ejIaW-&s=EESq-4vLPM3",
            },
            {
              addr: "web2pdf@hispanilandia.net",
              admin: "adbenitez",
              description: "Web to PDF converter",
              lang: "en",
              url: "OPENPGP4FPR:90F3B4441063F3C770FCD8FEE218583044B7032D#a=web2pdf%40hispanilandia.net&n=web2pdf&i=iX-CDo5AitT&s=NorJEYpieER",
            },
            {
              addr: "xkcd@hispanilandia.net",
              admin: "adbenitez",
              description: "A bot to fetch comics from https://xkcd.com",
              lang: "en",
              url: "OPENPGP4FPR:8CFCEA1E7CB8E914457D98E47AAD060AD1EBF992#a=xkcd%40hispanilandia.net&n=xkcd%20bot&i=pYj-Ex5wh-m&s=ktkqonTzmkK",
            },
          ],
          langs: { en: "English", es: "Español", multi: "Multi-language" },
        },
        lastUpdated: "2023-08-28T05:40:41.026815296+02:00",
      },
    },
  },
  "",
);
window.setTimeout(()=>{
    window.webxdc.sendUpdate(
        {
            payload:{
                error: {code: -543, message: "Fatal error. Something went pretty wrong, we are so sorry! :("},
                id: "sync",
            }
        });
}, 2000);
