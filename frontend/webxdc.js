// used for the github page

localStorage.clear();

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
        '[Webxdc] description="' +
          description +
          '", ' +
          JSON.stringify(_update),
      );
      updateListener(_update);
      if (_update.payload.method === "Sync") {
        sendData();
      }
    },
    sendToChat: async (content) => {
      if (!content.file && !content.text) {
        alert("🚨 Error: either file or text need to be set. (or both)");
        return Promise.reject(
          "Error from sendToChat: either file or text need to be set",
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
            ["blob", "base64", "plainText"].includes(key),
          ).length > 1
        ) {
          return Promise.reject(
            "you can only set one of `blob`, `base64` or `plainText`, not multiple ones",
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
            new Blob([content.file.plainText]),
          );
        } else {
          return Promise.reject(
            "data is not set or wrong format, set one of `blob`, `base64` or `plainText`, see webxdc documentation for sendToChat",
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
          msg + "\n\nDownload the file in the browser instead?",
        );
        if (confirmed) {
          var element = document.createElement("a");
          element.setAttribute(
            "href",
            "data:application/octet-stream;base64," + base64Content,
          );
          element.setAttribute("download", content.file.name);
          document.body.appendChild(element);
          element.click();
          document.body.removeChild(element);
        }
      } else {
        window.open(content.text);
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
function sendData() {
  fetch("./data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }
      return response.json();
    })
    .then((json) => {
      json.bots.map((bot) => {
        bot.admin = { ...json.admins[bot.admin], name: bot.admin };
        bot.lang = { code: bot.lang, label: json.langs[bot.lang] };
      });
      let now = new Date().toString();
      window.webxdc.sendUpdate({
        payload: {
          error: null,
          id: "sync",
          result: [
            now,
            {
              hash: now,
              bots: json.bots,
            },
            null,
          ],
        },
      });
    })
    .catch(function (err) {
      window.webxdc.sendUpdate({
        payload: {
          error: { code: -100, message: "Failed to fetch data: " + err },
          id: "sync",
        },
      });
    });
}
if (!localStorage.getItem("lastSyncReqKey")) {
  sendData();
}
