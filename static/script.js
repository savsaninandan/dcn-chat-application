const socket = io();


// =====================================================
// DOM
// =====================================================

const loginScreen =
    document.getElementById("loginScreen");

const chatScreen =
    document.getElementById("chatScreen");

const usernameInput =
    document.getElementById("usernameInput");

const joinButton =
    document.getElementById("joinButton");

const loginError =
    document.getElementById("loginError");

const headerUsername =
    document.getElementById("headerUsername");

const connectionStatus =
    document.getElementById("connectionStatus");

const connectionDot =
    document.getElementById("connectionDot");

const messages =
    document.getElementById("messages");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const userList =
    document.getElementById("userList");

const userCount =
    document.getElementById("userCount");

const roomList =
    document.getElementById("roomList");

const chatTarget =
    document.getElementById("chatTarget");

const typingIndicator =
    document.getElementById("typingIndicator");

const clearButton =
    document.getElementById("clearButton");

const privateRow =
    document.getElementById("privateRow");

const privateRecipient =
    document.getElementById("privateRecipient");

const globalChatButton =
    document.getElementById("globalChatButton");

const leaveRoomButton =
    document.getElementById("leaveRoomButton");

const createRoomButton =
    document.getElementById("createRoomButton");

const roomModal =
    document.getElementById("roomModal");

const roomNameInput =
    document.getElementById("roomNameInput");

const confirmRoomButton =
    document.getElementById("confirmRoomButton");

const cancelRoomButton =
    document.getElementById("cancelRoomButton");

const roomError =
    document.getElementById("roomError");

const emojiButton =
    document.getElementById("emojiButton");

const emojiPanel =
    document.getElementById("emojiPanel");


// =====================================================
// STATE
// =====================================================

let currentUsername = "";

let currentMode = "global";

let currentRoom = "";

let joined = false;

let typingTimer = null;

let isTyping = false;


// =====================================================
// SECURITY
// =====================================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent = text;

    return div.innerHTML;
}


// =====================================================
// LOGIN
// =====================================================

joinButton.addEventListener(
    "click",
    joinChat
);

usernameInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {
            joinChat();
        }

    }
);


function joinChat() {

    const username =
        usernameInput.value.trim();

    loginError.textContent = "";

    if (!username) {

        loginError.textContent =
            "Enter a username.";

        return;
    }

    currentUsername = username;

    socket.emit(
        "join",
        {
            username: username
        }
    );
}


// =====================================================
// CONNECTION
// =====================================================

socket.on(
    "connect",
    function() {

        connectionStatus.textContent =
            "Connected";

        connectionDot.className =
            "status-dot connected";

    }
);


socket.on(
    "disconnect",
    function() {

        connectionStatus.textContent =
            "Disconnected";

        connectionDot.className =
            "status-dot disconnected";

    }
);


// =====================================================
// JOIN SUCCESS
// =====================================================

socket.on(
    "join_success",
    function(data) {

        currentUsername =
            data.username;

        joined = true;

        loginScreen.classList.add(
            "hidden"
        );

        chatScreen.classList.remove(
            "hidden"
        );

        headerUsername.textContent =
            currentUsername;

        showGlobalChat();

    }
);


// =====================================================
// ERRORS
// =====================================================

socket.on(
    "username_taken",
    function(data) {

        loginError.textContent =
            data.message;

    }
);


socket.on(
    "error_message",
    function(data) {

        if (
            !roomModal.classList.contains(
                "hidden"
            )
        ) {

            roomError.textContent =
                data.message;

            return;
        }

        addSystemMessage(
            data.message
        );

    }
);


// =====================================================
// GLOBAL HISTORY
// =====================================================

socket.on(
    "global_history",
    function(data) {

        if (currentMode !== "global") {
            return;
        }

        messages.innerHTML = "";

        (data.messages || [])
            .forEach(
                addGlobalMessage
            );

        scrollBottom();

    }
);


// =====================================================
// GLOBAL MESSAGE
// =====================================================

socket.on(
    "global_message",
    function(data) {

        if (currentMode !== "global") {
            return;
        }

        addGlobalMessage(data);

        scrollBottom();

    }
);


function addGlobalMessage(data) {

    const mine =
        data.username === currentUsername;

    const div =
        document.createElement("div");

    div.className =
        "message" +
        (mine ? " mine" : "");

    div.innerHTML = `

        <div class="message-header">

            <span class="message-name">
                ${escapeHTML(data.username)}
            </span>

            <span class="message-time">
                ${escapeHTML(data.time)}
            </span>

        </div>

        <div class="message-text">
            ${escapeHTML(data.message)}
        </div>

    `;

    messages.appendChild(div);
}


// =====================================================
// SYSTEM MESSAGE
// =====================================================

socket.on(
    "system_message",
    function(data) {

        addSystemMessage(
            data.message,
            data.time
        );

        scrollBottom();

    }
);


function addSystemMessage(
    message,
    time = ""
) {

    const div =
        document.createElement("div");

    div.className =
        "system-message";

    div.textContent =
        time
        ? `${message} • ${time}`
        : message;

    messages.appendChild(div);

}


// =====================================================
// USER LIST
// =====================================================

socket.on(
    "user_list",
    function(data) {

        const users =
            data.users || [];

        userCount.textContent =
            users.length;

        userList.innerHTML = "";

        privateRecipient.innerHTML = "";

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";

        defaultOption.textContent =
            "Select user";

        privateRecipient.appendChild(
            defaultOption
        );


        users.forEach(
            function(username) {

                const item =
                    document.createElement("div");

                item.className =
                    "user-item";

                item.innerHTML = `

                    <span class="online-dot"></span>

                    <span>
                        ${escapeHTML(username)}
                    </span>

                `;

                userList.appendChild(item);


                if (
                    username !==
                    currentUsername
                ) {

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        username;

                    option.textContent =
                        username;

                    privateRecipient
                        .appendChild(
                            option
                        );

                }

            }
        );

    }
);


// =====================================================
// ROOM LIST
// =====================================================

socket.on(
    "room_list",
    function(data) {

        roomList.innerHTML = "";

        const rooms =
            data.rooms || [];

        if (rooms.length === 0) {

            const empty =
                document.createElement(
                    "div"
                );

            empty.className =
                "empty-room";

            empty.textContent =
                "No rooms yet";

            roomList.appendChild(
                empty
            );

            return;
        }


        rooms.forEach(
            function(room) {

                const button =
                    document.createElement(
                        "button"
                    );

                button.className =
                    "room-button";

                button.innerHTML = `

                    <span>
                        🏠
                        ${escapeHTML(room.name)}
                    </span>

                    <small>
                        ${room.count}
                    </small>

                `;

                button.addEventListener(
                    "click",
                    function() {

                        joinRoom(
                            room.name
                        );

                    }
                );

                roomList.appendChild(
                    button
                );

            }
        );

    }
);


// =====================================================
// CREATE ROOM
// =====================================================

createRoomButton.addEventListener(
    "click",
    function() {

        roomModal.classList.remove(
            "hidden"
        );

        roomNameInput.value = "";

        roomError.textContent = "";

        roomNameInput.focus();

    }
);


cancelRoomButton.addEventListener(
    "click",
    closeRoomModal
);


function closeRoomModal() {

    roomModal.classList.add(
        "hidden"
    );

}


confirmRoomButton.addEventListener(
    "click",
    function() {

        const room =
            roomNameInput.value.trim();

        roomError.textContent = "";

        if (!room) {

            roomError.textContent =
                "Enter a room name.";

            return;
        }

        socket.emit(
            "create_room",
            {
                room: room
            }
        );

        closeRoomModal();

    }
);


roomNameInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            confirmRoomButton.click();

        }

    }
);


// =====================================================
// ROOM CREATED
// =====================================================

socket.on(
    "room_created",
    function(data) {

        joinRoom(
            data.room
        );

    }
);


// =====================================================
// JOIN ROOM
// =====================================================

function joinRoom(room) {

    socket.emit(
        "join_room",
        {
            room: room
        }
    );

}


// =====================================================
// ROOM JOINED
// =====================================================

socket.on(
    "room_joined",
    function(data) {

        currentMode = "room";

        currentRoom =
            data.room;

        globalChatButton
            .classList
            .remove("active");

        document
            .querySelectorAll(
                ".room-button"
            )
            .forEach(
                btn => {

                    btn.classList.remove(
                        "active"
                    );

                }
            );

        chatTarget.textContent =
            "🏠 " + currentRoom;

        leaveRoomButton
            .classList
            .remove("hidden");

        privateRow
            .classList
            .add("hidden");

        messages.innerHTML = "";

        messageInput.focus();

    }
);


// =====================================================
// ROOM HISTORY
// =====================================================

socket.on(
    "room_history",
    function(data) {

        if (
            currentMode !== "room" ||
            currentRoom !== data.room
        ) {

            return;

        }

        messages.innerHTML = "";

        (data.messages || [])
            .forEach(
                addRoomMessage
            );

        scrollBottom();

    }
);


// =====================================================
// ROOM MESSAGE
// =====================================================

socket.on(
    "room_message",
    function(data) {

        if (
            currentMode !== "room" ||
            currentRoom !== data.room
        ) {

            return;

        }

        addRoomMessage(data);

        scrollBottom();

    }
);


function addRoomMessage(data) {

    const mine =
        data.username === currentUsername;

    const div =
        document.createElement("div");

    div.className =
        "message room-message" +
        (mine ? " mine" : "");

    div.innerHTML = `

        <div class="message-header">

            <span class="message-name">
                ${escapeHTML(data.username)}
            </span>

            <span class="message-time">
                ${escapeHTML(data.time)}
            </span>

        </div>

        <div class="message-text">
            ${escapeHTML(data.message)}
        </div>

    `;

    messages.appendChild(div);

}


// =====================================================
// ROOM SYSTEM MESSAGE
// =====================================================

socket.on(
    "room_system_message",
    function(data) {

        if (
            currentMode !== "room" ||
            currentRoom !== data.room
        ) {

            return;

        }

        addSystemMessage(
            data.message,
            data.time
        );

        scrollBottom();

    }
);


// =====================================================
// LEAVE ROOM
// =====================================================

leaveRoomButton.addEventListener(
    "click",
    function() {

        if (!currentRoom) {
            return;
        }

        socket.emit(
            "leave_room",
            {
                room: currentRoom
            }
        );

        showGlobalChat();

    }
);


// =====================================================
// GLOBAL CHAT
// =====================================================

globalChatButton.addEventListener(
    "click",
    showGlobalChat
);


function showGlobalChat() {

    if (
        currentMode === "room" &&
        currentRoom
    ) {

        socket.emit(
            "leave_room",
            {
                room: currentRoom
            }
        );

    }

    currentMode = "global";

    currentRoom = "";

    globalChatButton
        .classList
        .add("active");

    chatTarget.textContent =
        "🌐 Global Chat";

    leaveRoomButton
        .classList
        .add("hidden");

    privateRow
        .classList
        .remove("hidden");

    messages.innerHTML = "";

    socket.emit(
        "request_users"
    );

    // Ask server to resend global history
    socket.emit(
        "request_global_history"
    );

    messageInput.focus();

}


// =====================================================
// PRIVATE MESSAGE
// =====================================================

socket.on(
    "private_message",
    function(data) {

        const mine =
            data.sender === currentUsername;

        const div =
            document.createElement("div");

        div.className =
            "message private" +
            (mine ? " mine" : "");

        const label = mine
            ? `🔒 You → ${escapeHTML(data.recipient)}`
            : `🔒 ${escapeHTML(data.sender)} → You`;

        div.innerHTML = `

            <div class="message-header">

                <span class="message-name">
                    ${label}
                </span>

                <span class="message-time">
                    ${escapeHTML(data.time)}
                </span>

            </div>

            <div class="message-text">
                ${escapeHTML(data.message)}
            </div>

        `;

        messages.appendChild(div);

        scrollBottom();

    }
);


// =====================================================
// SEND MESSAGE
// =====================================================

sendButton.addEventListener(
    "click",
    sendMessage
);


messageInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();

        }

    }
);


function sendMessage() {

    const message =
        messageInput.value.trim();

    if (!message) {
        return;
    }


    // ROOM
    if (currentMode === "room") {

        socket.emit(
            "room_message",
            {
                room: currentRoom,
                message: message
            }
        );

    }

    // GLOBAL
    else {

        const recipient =
            privateRecipient.value;

        if (recipient) {

            socket.emit(
                "private_message",
                {
                    recipient: recipient,
                    message: message
                }
            );

        } else {

            socket.emit(
                "global_message",
                {
                    message: message
                }
            );

        }

    }


    messageInput.value = "";

    stopTyping();

    messageInput.focus();

}


// =====================================================
// TYPING
// =====================================================

messageInput.addEventListener(
    "input",
    function() {

        if (!isTyping) {

            isTyping = true;

            socket.emit(
                "typing",
                {
                    typing: true
                }
            );

        }

        clearTimeout(
            typingTimer
        );

        typingTimer =
            setTimeout(
                stopTyping,
                1000
            );

    }
);


function stopTyping() {

    if (!isTyping) {
        return;
    }

    isTyping = false;

    socket.emit(
        "typing",
        {
            typing: false
        }
    );

}


socket.on(
    "typing",
    function(data) {

        if (data.typing) {

            typingIndicator.textContent =
                `${data.username} is typing...`;

        } else {

            typingIndicator.textContent =
                "";

        }

    }
);


// =====================================================
// CLEAR
// =====================================================

clearButton.addEventListener(
    "click",
    function() {

        messages.innerHTML = "";

    }
);


// =====================================================
// EMOJIS
// =====================================================

emojiButton.addEventListener(
    "click",
    function() {

        emojiPanel.classList.toggle(
            "hidden"
        );

    }
);


document
    .querySelectorAll(
        ".emoji-panel button"
    )
    .forEach(
        function(button) {

            button.addEventListener(
                "click",
                function() {

                    messageInput.value +=
                        button.textContent;

                    messageInput.focus();

                    emojiPanel
                        .classList
                        .add("hidden");

                }
            );

        }
    );


// =====================================================
// SCROLL
// =====================================================

function scrollBottom() {

    messages.scrollTop =
        messages.scrollHeight;

}