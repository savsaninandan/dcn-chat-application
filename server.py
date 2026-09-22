import socket
import threading

HOST = "127.0.0.1"
PORT = 5000

clients = []
usernames = []


def broadcast(message, sender):
    for client in clients:
        if client != sender:
            try:
                client.send(message)
            except:
                remove_client(client)


def remove_client(client):
    if client in clients:
        index = clients.index(client)
        clients.remove(client)
        client.close()

        if index < len(usernames):
            username = usernames[index]
            usernames.remove(username)
            print(f"{username} disconnected.")


def handle_client(client, address):
    print(f"New connection from {address}")

    # Receive username
    client.send("USERNAME".encode())
    username = client.recv(1024).decode()

    clients.append(client)
    usernames.append(username)

    print(f"{username} joined the chat.")

    # Inform everyone
    join_message = f"{username} joined the chat."
    broadcast(join_message.encode(), client)

    while True:
        try:
            message = client.recv(1024)

            if not message:
                break

            text = f"{username}: {message.decode()}"

            print(text)

            # Send message to all other clients
            broadcast(text.encode(), client)

        except:
            break

    remove_client(client)

    leave_message = f"{username} left the chat."
    broadcast(leave_message.encode(), client)


# Create TCP socket
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

server.bind((HOST, PORT))
server.listen()

print("===================================")
print("       MULTI-CLIENT CHAT SERVER")
print("===================================")
print(f"Server running on {HOST}:{PORT}")
print("Waiting for clients...\n")


while True:
    client, address = server.accept()

    thread = threading.Thread(
        target=handle_client,
        args=(client, address)
    )

    thread.start()