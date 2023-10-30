const rx = /\r?\n/g;
const rx2 = /\s/g;
const debug = 0;

const urlObject = new URLSearchParams(window.location.search);

const argumentValue = urlObject.get("interval");
const resetinterval = argumentValue !== null ? parseInt(argumentValue, 10) : 3600;

const channelValue = urlObject.get("channel");
const channel = channelValue !== null ? channelValue : "kaicenat";


class TwitchIRCConnection {
  constructor(address = "wss://irc-ws.chat.twitch.tv/") {
    this.connected = false;
    this.interval = null;
    this.channel = null;
    this.client = null;
    this.address = address;
    this.timeCurrent = new Date();
    this.current_count = document.querySelector(".newCount")
  }

  connect() {
    if (!this.interval) {
      this.interval = setInterval(() => this._attemptConnection(), 2000);
    }
  }

  setChannel(channel) {
    this.channel = channel;
    if (this.connected) {
      this.client.send(`JOIN #${this.channel}`);
    }
  }

  _attemptConnection() {
    if (this.connected) {
      this._onConnect();
      return;
    }
    this.client = new WebSocket(this.address);
    this.client.onopen = () => {
      this.connected = true;
      this._onConnect();

      this.client.send(
        "CAP REQ :twitch.tv/tags twitch.tv/commands twitch.tv/membership"
      );
      this.client.send("PASS oauth:1231231");
      this.client.send("NICK justinfan123");
      if (this.channel) {
        this.client.send(`JOIN #${this.channel}`);
      }

      console.log("Connected to Twitch!");
    };
    this.client.onmessage = (e) => {
      const lines = e.data.split(rx);
      for (const line of lines) {
        if (line.replace(rx2, "") === "") {
          continue;
        }
        const parsed = this.parseIrcMessage(line);
        if (line === "PING :tmi.twitch.tv") {
          var timeDif = new Date() - this.timeCurrent;
          if ((timeDif / 1000) >= resetinterval && resetinterval !== 0) {
            this.timeCurrent = new Date();
            if (!debug) {
              console.log(`Updating Ping: last ping ${this.current_count.textContent}`);
            }
            this.current_count.textContent = 0;
          }
          this.client.send("PONG");
          return;
        }
        if (debug) {
          this.emit(parsed.command, parsed);
        }
      }
    };
    this.client.onerror = () => {
      if (!this.interval) {
        this.connected = false;
        this.client.close();
      }
      this.connect();
    };
  }

  _onConnect() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.emit("connect", "Connecting to Twitch");
  }

  parseIrcMessage(line) {
    const match = line.match(/:tmi.twitch.tv (.+) #/);
    const parsedMessage = {
      text: line,
      command: match ? match[1] : null,
    };

    if (line.includes("first-msg=1")) {
      this.current_count.textContent = Number(this.current_count.textContent) + 1;
      if (debug) {
        this.emit("Usernotice", line);
      }
    }

    return parsedMessage;
  }

  emit(event, data) {
    console.log(`Received event: ${event}`, data);
  }
}

const twitchIRCConnection = new TwitchIRCConnection();

twitchIRCConnection.setChannel(channel);
twitchIRCConnection.connect();
