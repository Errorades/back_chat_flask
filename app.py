from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# Хранение данных пользователей и чатов
users = {}
chats = {}

# Словарь для хранения открытых ключей пользователей
public_keys = {}

# Функция для получения открытого ключа клиента по его идентификатору
def get_public_key(user_id):
    return public_keys.get(user_id)

# Функция для генерации уникального идентификатора чата
def generate_chat_id(user_id1, user_id2):
    return f'{user_id1}_{user_id2}'

@app.route('/')
def index():
    return render_template('index.html')


@socketio.on('connect')
def handle_connect():
    # Генерация уникального идентификатора для каждого пользователя
    user_id = request.sid
    users[user_id] = {'id': user_id, 'chats': []}
    emit('user_connected', users[user_id])
    print(users)
    print(chats)

@socketio.on('disconnect')
def handle_disconnect():
    # Удаление пользователя из списка при отключении
    user_id = request.sid
    if user_id in users:
        for chat_id in users[user_id]['chats']:
            leave_chat(user_id, chat_id)
        del users[user_id]
        emit('user_disconnected', user_id, broadcast=True)

@socketio.on('join_chat')
def handle_join_chat(data):
    # Присоединение пользователя к чату
    user_id = request.sid
    other_user_id = data['user_id']
    chat_id = generate_chat_id(user_id, other_user_id)

    # Проверка наличия чата, если нет - создаем
    if chat_id not in chats:
        chats[chat_id] = {'id': chat_id, 'users': [user_id, other_user_id], 'messages': []}

    # Добавление чата к списку чатов пользователя
    users[user_id]['chats'].append(chat_id)

    emit('chat_joined', chats[chat_id])
    emit('chat_joined', chats[chat_id], room=other_user_id)
    join_room(chat_id, sid=user_id)
    join_room(chat_id, sid=other_user_id)

@socketio.on('leave_chat')
def handle_leave_chat(chat_id):
    # Покидание пользователем чата
    user_id = request.sid
    leave_chat(user_id, chat_id)
    emit('chat_left', chat_id)

@socketio.on('send_message')
def handle_send_message(data):
    # Отправка сообщения в чат
    user_id = request.sid
    chat_id = data['chat_id']
    message = {'user_id': user_id, 'message': data['message'], 'timestamp': data['timestamp'], 'signature': data['signature']}
    chats[chat_id]['messages'].append(message)
    content = {
        'chat_id': chat_id,
        'message': message,
    }
    emit('message_sent', content, room=chat_id)
    print(data['signature'])
    print(data['message'])

@socketio.on('send_public_key')
def handle_send_public_key(data):
    # Передача открытого ключа другому клиенту
    user_id = request.sid
    public_key = data['public_key']
    public_keys[user_id] = public_key  # Сохраняем публичный ключ пользователя

@socketio.on('request_public_key')
def handle_request_public_key(data):
    # user_id = request.sid
    other_user_id = data['user_id']
    emit('request_public_key', {'user_id': other_user_id, 'public_key': get_public_key(other_user_id)})
    print(get_public_key(other_user_id))



def leave_chat(user_id, chat_id):
    # Покидание чата пользователем
    if chat_id in chats:
        if user_id in chats[chat_id]['users']:
            chats[chat_id]['users'].remove(user_id)
            users[user_id]['chats'].remove(chat_id)
            if not chats[chat_id]['users']:
                del chats[chat_id]
        emit('chat_left', chat_id, room=chat_id)


if __name__ == '__main__':
    socketio.run(app, debug=True)
