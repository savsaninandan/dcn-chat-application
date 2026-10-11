# DCN Chat Application

A browser-based, real-time multi-user chat application built for the **Data Communication & Networking (DCN) special assignment — Topic A18**. It demonstrates client-server communication, event-driven messaging, global broadcasts, room-based group communication, and private one-to-one messages.

**Tech stack:** Python · Flask · Flask-SocketIO · Socket.IO · HTML · CSS · JavaScript

## Live Demo

- **Web application:** https://dcn-chat-application.onrender.com
- **Source code:** https://github.com/savsaninandan/dcn-chat-application

> A hosted service may take a little time to wake up after a period of inactivity. Check the live URL before using it in a presentation or resume.

## Features

- **Global chat:** Send messages to everyone currently connected.
- **Private messaging:** Send a direct message to a selected online user.
- **Optional chat rooms:** Create a room or join an existing room; rooms are not required to use global chat.
- **Live presence:** View the online-user list and room member counts.
- **Message history:** Retain up to 100 global messages and 100 messages per active room in server memory.
- **Typing indicators:** Notify other connected users while someone is typing.
- **System notifications:** Display join, leave, disconnect, and room lifecycle events.
- **Input validation:** Validate usernames and room names and limit message length.
- **Responsive interface:** UI adapts to desktop and mobile-sized screens.

## Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| Backend | Python, Flask | Serves the web page and application |
| Real-time layer | Flask-SocketIO, Socket.IO | Event-driven, bidirectional client-server communication |
| Frontend | HTML, CSS, JavaScript | Chat interface and client-side event handling |
| Hosting | Render | Public web deployment |
| Production server | Gunicorn, `simple-websocket` | Runs the threaded Socket.IO application |

## Architecture

```text
Browser clients
(index.html + script.js + style.css)
          |
          | Socket.IO events over polling / WebSocket transport
          v
Flask + Flask-SocketIO (app.py)
          |
          +------------------+-------------------+
          |                  |                   |
          v                  v                   v
     Global chat         Room chat          Private chat
     All clients       Room members       Sender + recipient
          |
          v
 In-memory user/session/room state and message history
```

The server uses each connection's Socket.IO session ID to address an individual client. Global messages are broadcast to connected clients, room messages are emitted to a named Socket.IO room, and private messages are sent to the selected recipient's session ID and echoed to the sender.

## Project Structure

```text
dcn-chat-application/
├── app.py                 # Flask-SocketIO backend and event handlers
├── client.py              # Earlier TCP socket chat client
├── server.py              # Earlier TCP socket chat server
├── requirements.txt       # Python dependencies
├── .python-version        # Python runtime version
├── templates/
│   └── index.html         # Chat application markup
└── static/
    ├── style.css          # Responsive UI styling
    └── script.js          # Socket.IO client events and UI behavior
```

`client.py` and `server.py` preserve an earlier TCP-socket prototype. The browser-based application uses `app.py`, `templates/index.html`, and `static/`.

## Run Locally (Windows)

### 1. Clone the repository

Open Command Prompt or PowerShell:

```powershell
git clone https://github.com/savsaninandan/dcn-chat-application.git
cd dcn-chat-application
```

### 2. Create and activate a virtual environment

```powershell
py -m venv .venv
.venv\Scripts\activate
```

### 3. Install dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Start the application

```powershell
python app.py
```

Open **http://127.0.0.1:5000** in your browser. Open the same address in multiple browser windows with different usernames to test multi-client messaging. For another device on your local network, use your computer's LAN IP address and ensure the firewall permits the connection.

## Deploy on Render

Create a **Web Service** connected to this GitHub repository and use:

| Setting | Value |
|---|---|
| Runtime | Python |
| Build command | `pip install -r requirements.txt` |
| Start command | `gunicorn -w 1 --threads 100 app:app` |

The project includes `gunicorn` and `simple-websocket` in `requirements.txt`. The current in-memory architecture is designed for a single worker process. Scaling to multiple worker processes requires shared state/message coordination and appropriate session routing.

## Networking Concepts Demonstrated

- **Client-server architecture:** Multiple browser clients connect to a central server.
- **Persistent, bidirectional communication:** Socket.IO exchanges events without requiring a page refresh.
- **Broadcast delivery:** Global messages are sent to connected clients.
- **Group delivery:** Room messages are sent to members of a selected Socket.IO room.
- **Unicast-style delivery:** Private messages target a particular connected user's session.
- **Connection/session management:** The server maps usernames to active Socket.IO session IDs and updates presence on disconnect.

## Important Limitations

- **In-memory state:** Users, rooms, and message histories are held in Python memory. They are cleared when the server process restarts; messages are not stored in a database.
- **Temporary identities:** Usernames distinguish currently connected users but are not backed by account registration or password authentication.
- **No end-to-end encryption:** Private messages are targeted to the intended connected users by the server, but the application does not implement end-to-end encryption. Do not send sensitive information.
- **Single-process design:** The current in-memory state is intended for a student demonstration, not a horizontally scaled production messaging service.
- **CORS configuration:** Review the permissive development CORS setting before adapting this project for production use.

## Testing Checklist

Use two or more browser windows with different usernames to verify:

- [ ] Users can join with unique valid usernames.
- [ ] A global message appears for all connected clients.
- [ ] A private message appears for the sender and selected recipient.
- [ ] A user can create a room and is automatically added to it.
- [ ] Another user can join the room and exchange room messages.
- [ ] Room membership counts update when users join or leave.
- [ ] An empty room is removed.
- [ ] Online-user lists update after a user disconnects.
- [ ] The interface remains usable at a mobile viewport width.

## Assignment Context

- **Course:** Data Communication & Networking
- **Assignment topic:** A18 — Create a chatting application in C/C++/Python
- **Purpose:** Demonstrate practical client-server networking and real-time message delivery.

---

Developed as an academic networking project. Contributions, issues, and suggestions are welcome.
