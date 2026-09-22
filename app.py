from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from datetime import datetime
import re

app = Flask(__name__)
app.config["SECRET_KEY"] = "dcn-chat-secret"

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode="threading"
)

# =========================================================
# CONFIGURATION
# =========================================================

MAX_USERNAME_LENGTH = 20
MAX_MESSAGE_LENGTH = 500
MAX_ROOM_LENGTH = 30
MAX_HISTORY = 100


# =========================================================
# DATA
# =========================================================

# normalized_username -> {
#     sid: socket id,
#     username: display username
# }
users = {}

# sid -> username
sessions = {}

# room_name -> {
#     name: display room name,
#     creator: username,
#     members: set(),
#     history: []
# }
rooms = {}

# Global public chat history
global_history = []


# =========================================================
# HELPERS
# =========================================================

def get_time():
    return datetime.now().strftime("%H:%M")


def normalize(value):
    return value.strip().lower()


def valid_name(value):
    return bool(
        re.fullmatch(r"[A-Za-z0-9_-]+", value)
    )


def clean_message(message):
    return str(message).strip()[:MAX_MESSAGE_LENGTH]


def current_username():
    return sessions.get(request.sid)


def send_user_list():
    socketio.emit(
        "user_list",
        {
            "users": [
                data["username"]
                for data in users.values()
            ],
            "count": len(users)
        }
    )


def send_room_list():
    room_data = []

    for key, room in rooms.items():
        room_data.append({
            "name": room["name"],
            "creator": room["creator"],
            "count": len(room["members"])
        })

    room_data.sort(
        key=lambda x: x["name"].lower()
    )

    socketio.emit(
        "room_list",
        {
            "rooms": room_data
        }
    )


def send_room_members(room_key):
    if room_key not in rooms:
        return

    room = rooms[room_key]

    members = sorted(
        list(room["members"]),
        key=str.lower
    )

    socketio.emit(
        "room_members",
        {
            "room": room["name"],
            "members": members,
            "count": len(members)
        },
        to=room_key
    )


# =========================================================
# MAIN PAGE
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# JOIN APPLICATION
# =========================================================

@socketio.on("join")
def handle_join(data):

    username = str(
        data.get("username", "")
    ).strip()

    if not username:
        emit(
            "error_message",
            {
                "message":
                "Username cannot be empty."
            }
        )
        return

    if len(username) > MAX_USERNAME_LENGTH:
        emit(
            "error_message",
            {
                "message":
                f"Username must be {MAX_USERNAME_LENGTH} "
                "characters or less."
            }
        )
        return

    if not valid_name(username):
        emit(
            "error_message",
            {
                "message":
                "Username can contain only letters, "
                "numbers, _ and -."
            }
        )
        return

    key = normalize(username)

    if key in users:
        emit(
            "username_taken",
            {
                "message":
                "This username is already online."
            }
        )
        return

    users[key] = {
        "sid": request.sid,
        "username": username
    }

    sessions[request.sid] = username

    emit(
        "join_success",
        {
            "username": username
        }
    )

    # Global history
    emit(
        "global_history",
        {
            "messages": global_history
        }
    )

    socketio.emit(
        "system_message",
        {
            "message":
            f"{username} joined the global chat.",
            "time": get_time()
        }
    )

    send_user_list()
    send_room_list()

    print(
        f"[JOIN] {username} | "
        f"Online: {len(users)}"
    )


# =========================================================
# GLOBAL CHAT
# =========================================================

@socketio.on("global_message")
def handle_global_message(data):

    username = current_username()

    if not username:
        return

    message = clean_message(
        data.get("message", "")
    )

    if not message:
        return

    message_data = {
        "username": username,
        "message": message,
        "time": get_time()
    }

    global_history.append(message_data)

    if len(global_history) > MAX_HISTORY:
        global_history.pop(0)

    socketio.emit(
        "global_message",
        message_data
    )

    print(
        f"[GLOBAL] {username}: {message}"
    )


# =========================================================
# CREATE ROOM
# =========================================================

@socketio.on("create_room")
def handle_create_room(data):

    username = current_username()

    if not username:
        return

    room_name = str(
        data.get("room", "")
    ).strip()

    if not room_name:
        emit(
            "error_message",
            {
                "message":
                "Room name cannot be empty."
            }
        )
        return

    if len(room_name) > MAX_ROOM_LENGTH:
        emit(
            "error_message",
            {
                "message":
                f"Room name must be "
                f"{MAX_ROOM_LENGTH} characters or less."
            }
        )
        return

    if not valid_name(room_name):
        emit(
            "error_message",
            {
                "message":
                "Room name can contain only "
                "letters, numbers, _ and -."
            }
        )
        return

    room_key = normalize(room_name)

    if room_key in rooms:
        emit(
            "error_message",
            {
                "message":
                "A room with this name already exists."
            }
        )
        return

    rooms[room_key] = {
        "name": room_name,
        "creator": username,
        "members": set(),
        "history": []
    }

    # Automatically join creator
    join_room(room_key)

    rooms[room_key]["members"].add(username)

    emit(
        "room_created",
        {
            "room": room_name
        }
    )

    emit(
        "room_history",
        {
            "room": room_name,
            "messages": []
        }
    )

    socketio.emit(
        "system_message",
        {
            "message":
            f"{username} created room '{room_name}'.",
            "time": get_time()
        }
    )

    send_room_list()
    send_room_members(room_key)

    print(
        f"[ROOM CREATED] {username} -> {room_name}"
    )


# =========================================================
# JOIN ROOM
# =========================================================

@socketio.on("join_room")
def handle_join_room(data):

    username = current_username()

    if not username:
        return

    room_name = str(
        data.get("room", "")
    ).strip()

    room_key = normalize(room_name)

    if room_key not in rooms:
        emit(
            "error_message",
            {
                "message":
                f"Room '{room_name}' does not exist."
            }
        )
        return

    room = rooms[room_key]

    # If already inside
    if username in room["members"]:

        emit(
            "room_joined",
            {
                "room": room["name"]
            }
        )

        emit(
            "room_history",
            {
                "room": room["name"],
                "messages": room["history"]
            }
        )

        return

    join_room(room_key)

    room["members"].add(username)

    emit(
        "room_joined",
        {
            "room": room["name"]
        }
    )

    emit(
        "room_history",
        {
            "room": room["name"],
            "messages": room["history"]
        }
    )

    socketio.emit(
        "room_system_message",
        {
            "room": room["name"],
            "message":
            f"{username} joined the room.",
            "time": get_time()
        },
        to=room_key
    )

    send_room_list()
    send_room_members(room_key)

    print(
        f"[ROOM JOIN] {username} -> {room['name']}"
    )


# =========================================================
# LEAVE ROOM
# =========================================================

@socketio.on("leave_room")
def handle_leave_room(data):

    username = current_username()

    if not username:
        return

    room_name = str(
        data.get("room", "")
    ).strip()

    room_key = normalize(room_name)

    if room_key not in rooms:
        return

    room = rooms[room_key]

    if username not in room["members"]:
        return

    leave_room(room_key)

    room["members"].discard(username)

    socketio.emit(
        "room_system_message",
        {
            "room": room["name"],
            "message":
            f"{username} left the room.",
            "time": get_time()
        },
        to=room_key
    )

    # Delete empty room
    if len(room["members"]) == 0:

        del rooms[room_key]

        socketio.emit(
            "system_message",
            {
                "message":
                f"Room '{room['name']}' was closed.",
                "time": get_time()
            }
        )

    else:

        send_room_members(room_key)

    send_room_list()

    print(
        f"[ROOM LEAVE] "
        f"{username} <- {room_name}"
    )


# =========================================================
# ROOM MESSAGE
# =========================================================

@socketio.on("room_message")
def handle_room_message(data):

    username = current_username()

    if not username:
        return

    room_name = str(
        data.get("room", "")
    ).strip()

    room_key = normalize(room_name)

    message = clean_message(
        data.get("message", "")
    )

    if room_key not in rooms:
        return

    if not message:
        return

    room = rooms[room_key]

    if username not in room["members"]:
        return

    message_data = {
        "username": username,
        "message": message,
        "time": get_time(),
        "room": room["name"]
    }

    room["history"].append(message_data)

    if len(room["history"]) > MAX_HISTORY:
        room["history"].pop(0)

    socketio.emit(
        "room_message",
        message_data,
        to=room_key
    )

    print(
        f"[ROOM:{room['name']}] "
        f"{username}: {message}"
    )


# =========================================================
# PRIVATE MESSAGE
# =========================================================

@socketio.on("private_message")
def handle_private_message(data):

    sender = current_username()

    if not sender:
        return

    recipient = str(
        data.get("recipient", "")
    ).strip()

    message = clean_message(
        data.get("message", "")
    )

    if not recipient or not message:
        return

    recipient_data = users.get(
        normalize(recipient)
    )

    if not recipient_data:

        emit(
            "error_message",
            {
                "message":
                f"User '{recipient}' is not online."
            }
        )

        return

    message_data = {
        "sender": sender,
        "recipient":
            recipient_data["username"],
        "message": message,
        "time": get_time()
    }

    socketio.emit(
        "private_message",
        message_data,
        to=recipient_data["sid"]
    )

    socketio.emit(
        "private_message",
        message_data,
        to=request.sid
    )

    print(
        f"[PRIVATE] {sender} -> "
        f"{recipient}: {message}"
    )


# =========================================================
# TYPING
# =========================================================

@socketio.on("typing")
def handle_typing(data):

    username = current_username()

    if not username:
        return

    socketio.emit(
        "typing",
        {
            "username": username,
            "typing": bool(
                data.get("typing", False)
            )
        },
        skip_sid=request.sid
    )


# =========================================================
# DISCONNECT
# =========================================================

@socketio.on("disconnect")
def handle_disconnect():

    username = sessions.pop(
        request.sid,
        None
    )

    if not username:
        return

    users.pop(
        normalize(username),
        None
    )

    # Remove user from all rooms
    rooms_to_delete = []

    for room_key, room in rooms.items():

        if username in room["members"]:

            leave_room(room_key)

            room["members"].discard(username)

            socketio.emit(
                "room_system_message",
                {
                    "room": room["name"],
                    "message":
                    f"{username} disconnected.",
                    "time": get_time()
                },
                to=room_key
            )

            if len(room["members"]) == 0:
                rooms_to_delete.append(room_key)
            else:
                send_room_members(room_key)

    for room_key in rooms_to_delete:

        room_name = rooms[room_key]["name"]

        del rooms[room_key]

        socketio.emit(
            "system_message",
            {
                "message":
                f"Room '{room_name}' was closed.",
                "time": get_time()
            }
        )

    socketio.emit(
        "system_message",
        {
            "message":
            f"{username} left the global chat.",
            "time": get_time()
        }
    )

    send_user_list()
    send_room_list()

    print(
        f"[DISCONNECT] {username}"
    )


# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":

    print("=" * 60)
    print(" DCN CHAT APPLICATION")
    print("=" * 60)
    print(" Global Chat + Room Chat + Private Messaging")
    print()
    print(" http://127.0.0.1:5000")
    print("=" * 60)

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )