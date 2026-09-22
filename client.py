import socket
import threading

HOST = "127.0.0.1"
PORT = 5000


def receive_messages():
    while True:
        try:
            message = client.recv(1024).decode()

            if message == "USERNAME":
                client.send(username.encode())
            else:
                print(f"\n{message}")
                print("You: ", end="", flush=True)

        except:
            print("\nConnection to server lost.")
            break


# Create TCP socket
client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Connect to server
client.connect((HOST, PORT))

print("===================================")
print("        MULTI-CLIENT CHAT")
print("===================================")

username = input("Enter your username: ")

# Start receiving thread
receive_thread = threading.Thread(
    target=receive_messages
)

receive_thread.daemon = True
receive_thread.start()

print("\nConnected to chat server!")
print("Type 'exit' to leave the chat.\n")

# Send messages
while True:
    message = input("You: ")

    if message.lower() == "exit":
        break

    client.send(message.encode())

client.close()